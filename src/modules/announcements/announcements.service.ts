import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';
import { Announcement, AnnouncementDocument } from '../../schemas/announcement.schema';
import { AnnouncementRecipient, AnnouncementRecipientDocument } from '../../schemas/announcement-recipient.schema';
import { NewsletterSubscriber, NewsletterSubscriberDocument } from '../../schemas/newsletter-subscriber.schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { ANNOUNCEMENT_QUEUE, AnnouncementJobs } from '../../infrastructure/queues/queue.constants';
import type { AnnouncementJobData } from '../../infrastructure/queues/announcement.processor';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,

    @InjectModel(AnnouncementRecipient.name)
    private readonly recipientModel: Model<AnnouncementRecipientDocument>,

    @InjectModel(NewsletterSubscriber.name)
    private readonly subscriberModel: Model<NewsletterSubscriberDocument>,

    @InjectQueue(ANNOUNCEMENT_QUEUE)
    private readonly announcementQueue: Queue<AnnouncementJobData>,
  ) {}

  // ─── List / Get ──────────────────────────────────────────────────────────────

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.announcementModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.announcementModel.countDocuments().exec(),
    ]);
    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const doc = await this.announcementModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Campagne introuvable');
    return this.toObject(doc);
  }

  async findRecipients(id: string, page = 1, limit = 50) {
    const announcement = await this.announcementModel.findById(id).exec();
    if (!announcement) throw new NotFoundException('Campagne introuvable');

    const skip = (page - 1) * limit;
    const filter = { announcementId: new Types.ObjectId(id) };

    const [docs, total] = await Promise.all([
      this.recipientModel.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit).exec(),
      this.recipientModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => {
        const obj = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
        delete obj['__v'];
        return obj;
      }),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // ─── Create / Update ─────────────────────────────────────────────────────────

  async create(dto: CreateAnnouncementDto, userId: string) {
    if (dto.sendMode === 'SCHEDULED' && !dto.scheduledAt) {
      throw new BadRequestException('scheduledAt est requis pour le mode SCHEDULED');
    }

    // Count recipients before confirming
    const recipientCount = await this.countRecipients(dto.audience.groups);

    const doc = await this.announcementModel.create({
      subject: dto.subject,
      contentHtml: dto.contentHtml,
      audience: dto.audience,
      sendMode: dto.sendMode,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      status: dto.sendMode === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT',
      recipientCount,
      metrics: { sent: 0, failed: 0 },
      createdBy: userId,
    });

    return this.toObject(doc);
  }

  async update(id: string, dto: Partial<CreateAnnouncementDto>) {
    const doc = await this.announcementModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Campagne introuvable');

    if (!['DRAFT', 'SCHEDULED'].includes(doc.status)) {
      throw new BadRequestException('Seules les campagnes DRAFT ou SCHEDULED peuvent être modifiées');
    }

    const updated = await this.announcementModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Campagne introuvable');
    return this.toObject(updated);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async send(id: string) {
    const doc = await this.announcementModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Campagne introuvable');

    if (!['DRAFT', 'SCHEDULED'].includes(doc.status)) {
      throw new BadRequestException(
        `Cette campagne ne peut pas être envoyée (statut actuel : ${doc.status})`,
      );
    }

    // Add job to queue - immediate execution
    const job = await this.announcementQueue.add(
      AnnouncementJobs.SEND_NOW,
      { announcementId: id },
      {
        attempts: 3,           // retry up to 3 times on failure
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100, // keep last 100 completed jobs
        removeOnFail: 200,
      },
    );

    return {
      id,
      jobId: job.id,
      status: 'PROCESSING',
      message: 'Campagne ajoutée à la file d\'envoi',
    };
  }

  async schedule(id: string, scheduledAt: string) {
    const doc = await this.announcementModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Campagne introuvable');

    if (doc.status !== 'DRAFT') {
      throw new BadRequestException('Seules les campagnes DRAFT peuvent être programmées');
    }

    const sendAt = new Date(scheduledAt);
    const delay = sendAt.getTime() - Date.now();

    if (delay <= 0) {
      throw new BadRequestException('La date d\'envoi doit être dans le futur');
    }

    // Add job to queue with delay
    const job = await this.announcementQueue.add(
      AnnouncementJobs.SEND_SCHEDULED,
      { announcementId: id },
      {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    await this.announcementModel.findByIdAndUpdate(id, {
      $set: {
        status: 'SCHEDULED',
        scheduledAt: sendAt,
        bullJobId: job.id,
      },
    }).exec();

    return {
      id,
      jobId: job.id,
      status: 'SCHEDULED',
      scheduledAt,
    };
  }

  async cancel(id: string) {
    const doc = await this.announcementModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Campagne introuvable');

    if (doc.status !== 'SCHEDULED') {
      throw new BadRequestException('Seules les campagnes SCHEDULED peuvent être annulées');
    }

    // Remove the job from the queue if it exists
    const bullJobId = (doc as AnnouncementDocument & { bullJobId?: string }).bullJobId;
    if (bullJobId) {
      const job = await this.announcementQueue.getJob(bullJobId);
      if (job) {
        await job.remove();
      }
    }

    await this.announcementModel.findByIdAndUpdate(id, {
      $set: { status: 'CANCELLED', bullJobId: null },
    }).exec();

    return { id, status: 'CANCELLED' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async countRecipients(groups: string[]): Promise<number> {
    let count = 0;
    if (groups.includes('NEWSLETTER') || groups.includes('ALL')) {
      count += await this.subscriberModel.countDocuments({ status: 'SUBSCRIBED' }).exec();
    }
    return count;
  }

  private toObject(doc: AnnouncementDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
