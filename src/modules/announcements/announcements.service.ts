import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Announcement, AnnouncementDocument } from '../../schemas/announcement.schema';
import { NewsletterSubscriber, NewsletterSubscriberDocument } from '../../schemas/newsletter-subscriber.schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,

    @InjectModel(NewsletterSubscriber.name)
    private readonly subscriberModel: Model<NewsletterSubscriberDocument>,
  ) {}

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

  async send(id: string) {
    const doc = await this.announcementModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Campagne introuvable');
    if (!['DRAFT', 'SCHEDULED'].includes(doc.status)) {
      throw new BadRequestException('Cette campagne ne peut pas être envoyée');
    }

    // Mark as PROCESSING - actual sending would be done by a queue/worker
    await this.announcementModel.findByIdAndUpdate(id, {
      $set: { status: 'PROCESSING' },
    }).exec();

    return { id, status: 'PROCESSING', message: 'Campagne mise en file d\'envoi' };
  }

  async schedule(id: string, scheduledAt: string) {
    const doc = await this.announcementModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Campagne introuvable');
    if (doc.status !== 'DRAFT') {
      throw new BadRequestException('Seules les campagnes DRAFT peuvent être programmées');
    }

    await this.announcementModel.findByIdAndUpdate(id, {
      $set: { status: 'SCHEDULED', scheduledAt: new Date(scheduledAt) },
    }).exec();

    return { id, status: 'SCHEDULED', scheduledAt };
  }

  async cancel(id: string) {
    const doc = await this.announcementModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Campagne introuvable');
    if (doc.status !== 'SCHEDULED') {
      throw new BadRequestException('Seules les campagnes SCHEDULED peuvent être annulées');
    }
    await this.announcementModel.findByIdAndUpdate(id, { $set: { status: 'CANCELLED' } }).exec();
    return { id, status: 'CANCELLED' };
  }

  private async countRecipients(groups: string[]): Promise<number> {
    let count = 0;
    if (groups.includes('NEWSLETTER')) {
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
