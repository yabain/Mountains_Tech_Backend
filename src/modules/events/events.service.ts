import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEntity, EventDocument } from '../../schemas/event.schema';
import { EventRegistration, EventRegistrationDocument } from '../../schemas/event-registration.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { AddPanelistDto } from './dto/panelist.dto';
import { UpdatePanelistsDto } from './dto/panelist.dto';

import { MailService } from '../../infrastructure/mail/mail.service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: ['DRAFT'],
};

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(EventEntity.name)
    private readonly eventModel: Model<EventDocument>,

    @InjectModel(EventRegistration.name)
    private readonly registrationModel: Model<EventRegistrationDocument>,

    private readonly mailService: MailService,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

  async findPublished(query: QueryEventsDto) {
    const { page = 1, limit = 20, search, category, upcoming, sortBy = 'startAt', sortOrder = 'asc' } = query;

    const filter: Record<string, unknown> = { status: 'PUBLISHED' };

    if (upcoming) filter['startAt'] = { $gte: new Date() };
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ title: regex }, { excerpt: regex }];
    }
    if (category) filter['category'] = category;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.eventModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.eventModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const doc = await this.eventModel.findOne({ slug, status: 'PUBLISHED' }).exec();
    if (!doc) throw new NotFoundException('Événement introuvable');
    return this.toObject(doc);
  }

  async register(eventId: string, dto: RegisterEventDto) {
    if (!dto.consent) {
      throw new BadRequestException('Le consentement est requis pour s\'inscrire');
    }

    const event = await this.eventModel.findById(eventId).exec();
    if (!event) throw new NotFoundException('Événement introuvable');
    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException('Les inscriptions ne sont pas ouvertes pour cet événement');
    }
    if (!event.registrationRequired) {
      throw new BadRequestException('Cet événement ne nécessite pas d\'inscription');
    }

    // Check capacity
    if (event.capacity) {
      const count = await this.registrationModel
        .countDocuments({ eventId: new Types.ObjectId(eventId), status: 'CONFIRMED' })
        .exec();
      if (count >= event.capacity) {
        throw new BadRequestException('La capacité maximale de cet événement est atteinte');
      }
    }

    // Check duplicate registration
    const existing = await this.registrationModel
      .findOne({ eventId: new Types.ObjectId(eventId), email: dto.email })
      .exec();
    if (existing) {
      throw new ConflictException('Cette adresse email est déjà inscrite à cet événement');
    }

    const doc = await this.registrationModel.create({
      eventId: new Types.ObjectId(eventId),
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      organization: dto.organization,
      consent: dto.consent,
      status: 'CONFIRMED',
    });

    // Confirmation email
    void this.mailService.sendEventRegistrationConfirmation({
      to: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      eventTitle: event.title,
      startAt: event.startAt.toLocaleString('fr-FR'),
      endAt: event.endAt?.toLocaleString('fr-FR'),
      location: event.location ?? 'À définir',
      registrationId: String(doc._id),
    });

    return {
      registrationId: String(doc._id),
      status: doc.status,
    };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async findAll(query: QueryEventsDto) {
    const { page = 1, limit = 20, search, category, status, upcoming, sortBy = 'startAt', sortOrder = 'asc' } = query;

    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;
    if (category) filter['category'] = category;
    if (upcoming) filter['startAt'] = { $gte: new Date() };
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ title: regex }, { excerpt: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.eventModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.eventModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const doc = await this.eventModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Événement introuvable');
    return this.toObject(doc);
  }

  async create(dto: CreateEventDto, userId: string) {
    const slug = await this.resolveUniqueSlug(dto.slug ?? slugify(dto.title));
    const publishedAt = dto.status === 'PUBLISHED' ? new Date() : undefined;

    const doc = await this.eventModel.create({
      title: dto.title,
      slug,
      excerpt: dto.excerpt,
      coverUrl: dto.coverUrl,
      category: dto.category,
      location: dto.location,
      startAt: new Date(dto.startAt),
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      registrationRequired: dto.registrationRequired ?? false,
      capacity: dto.capacity,
      status: dto.status ?? 'DRAFT',
      publishedAt,
      createdBy: userId,
    });

    return this.toObject(doc);
  }

  async update(id: string, dto: UpdateEventDto) {
    const doc = await this.eventModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Événement introuvable');

    if (dto.status && dto.status !== doc.status) {
      const allowed = STATUS_TRANSITIONS[doc.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transition de statut invalide : ${doc.status} → ${dto.status}`,
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined) updateData['title'] = dto.title;
    if (dto.excerpt !== undefined) updateData['excerpt'] = dto.excerpt;
    if (dto.coverUrl !== undefined) updateData['coverUrl'] = dto.coverUrl;
    if (dto.category !== undefined) updateData['category'] = dto.category;
    if (dto.location !== undefined) updateData['location'] = dto.location;
    if (dto.startAt !== undefined) updateData['startAt'] = new Date(dto.startAt);
    if (dto.endAt !== undefined) updateData['endAt'] = new Date(dto.endAt);
    if (dto.registrationRequired !== undefined) updateData['registrationRequired'] = dto.registrationRequired;
    if (dto.capacity !== undefined) updateData['capacity'] = dto.capacity;

    if (dto.slug && dto.slug !== doc.slug) {
      updateData['slug'] = await this.resolveUniqueSlug(dto.slug, id);
    }

    if (dto.status) {
      updateData['status'] = dto.status;
      if (dto.status === 'PUBLISHED' && !doc.publishedAt) {
        updateData['publishedAt'] = new Date();
      }
    }

    const updated = await this.eventModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Événement introuvable');
    return this.toObject(updated);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.eventModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Événement introuvable');

    if (doc.status === 'PUBLISHED') {
      throw new BadRequestException(
        'Un événement publié ne peut pas être supprimé. Archivez-le d\'abord.',
      );
    }

    await this.eventModel.findByIdAndDelete(id).exec();
  }

  async findRegistrations(eventId: string, page = 1, limit = 20) {
    const event = await this.eventModel.findById(eventId).exec();
    if (!event) throw new NotFoundException('Événement introuvable');

    const skip = (page - 1) * limit;
    const filter = { eventId: new Types.ObjectId(eventId) };

    const [docs, total] = await Promise.all([
      this.registrationModel.find(filter).skip(skip).limit(limit).exec(),
      this.registrationModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async addPanelist(eventId: string, dto: AddPanelistDto) {
    const updated = await this.eventModel
      .findByIdAndUpdate(
        eventId,
        {
          $push: {
            panelists: {
              name: dto.name,
              role: dto.role,
              photoUrl: dto.photoUrl,
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) throw new NotFoundException('Événement introuvable');
    return this.toObject(updated);
  }

  async setPanelists(eventId: string, dto: UpdatePanelistsDto) {
    const updated = await this.eventModel
      .findByIdAndUpdate(
        eventId,
        { $set: { panelists: dto.panelists } },
        { new: true },
      )
      .exec();

    if (!updated) throw new NotFoundException('Événement introuvable');
    return this.toObject(updated);
  }

  async removePanelist(eventId: string, panelistIndex: number) {
    const doc = await this.eventModel.findById(eventId).exec();
    if (!doc) throw new NotFoundException('Événement introuvable');

    const panelists = doc.panelists ?? [];
    if (!Number.isInteger(panelistIndex) || panelistIndex < 0 || panelistIndex >= panelists.length) {
      throw new BadRequestException('Index de panéliste invalide');
    }

    await this.eventModel
      .updateOne({ _id: new Types.ObjectId(eventId) }, { $unset: { [`panelists.${panelistIndex}`]: 1 } })
      .exec();

    const updated = await this.eventModel
      .findByIdAndUpdate(eventId, { $pull: { panelists: null } }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Événement introuvable');
    return this.toObject(updated);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (true) {
      const existing = await this.eventModel.findOne({ slug }).exec();
      if (!existing || (excludeId && String(existing._id) === excludeId)) break;
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  private toObject(doc: EventDocument | EventRegistrationDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
