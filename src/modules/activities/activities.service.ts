import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from '../../schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Allowed content workflow transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: ['DRAFT'],
};

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

  async findPublished(query: QueryActivitiesDto) {
    const { page = 1, limit = 20, search, category, sortBy = 'publishedAt', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = { status: 'PUBLISHED' };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ title: regex }, { excerpt: regex }];
    }
    if (category) filter['category'] = category;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.activityModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.activityModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const doc = await this.activityModel
      .findOne({ slug, status: 'PUBLISHED' })
      .exec();
    if (!doc) throw new NotFoundException('Activité introuvable');
    return this.toObject(doc);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async findAll(query: QueryActivitiesDto) {
    const { page = 1, limit = 20, search, category, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;
    if (category) filter['category'] = category;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ title: regex }, { excerpt: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.activityModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.activityModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const doc = await this.activityModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Activité introuvable');
    return this.toObject(doc);
  }

  async create(dto: CreateActivityDto, userId: string) {
    const slug = await this.resolveUniqueSlug(dto.slug ?? slugify(dto.title));

    const publishedAt = dto.status === 'PUBLISHED' ? new Date() : undefined;

    const doc = await this.activityModel.create({
      title: dto.title,
      slug,
      excerpt: dto.excerpt,
      contentHtml: dto.contentHtml,
      coverUrl: dto.coverUrl,
      category: dto.category,
      status: dto.status ?? 'DRAFT',
      publishedAt,
      createdBy: userId,
    });

    return this.toObject(doc);
  }

  async update(id: string, dto: UpdateActivityDto) {
    const doc = await this.activityModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Activité introuvable');

    // Validate status transition if status is changing
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
    if (dto.contentHtml !== undefined) updateData['contentHtml'] = dto.contentHtml;
    if (dto.coverUrl !== undefined) updateData['coverUrl'] = dto.coverUrl;
    if (dto.category !== undefined) updateData['category'] = dto.category;

    if (dto.slug && dto.slug !== doc.slug) {
      updateData['slug'] = await this.resolveUniqueSlug(dto.slug, id);
    }

    if (dto.status) {
      updateData['status'] = dto.status;
      // Set publishedAt on first publish
      if (dto.status === 'PUBLISHED' && !doc.publishedAt) {
        updateData['publishedAt'] = new Date();
      }
    }

    const updated = await this.activityModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Activité introuvable');
    return this.toObject(updated);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.activityModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Activité introuvable');

    // Only DRAFT or ARCHIVED can be deleted
    if (doc.status === 'PUBLISHED') {
      throw new BadRequestException(
        'Une activité publiée ne peut pas être supprimée. Archivez-la d\'abord.',
      );
    }

    await this.activityModel.findByIdAndDelete(id).exec();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 1;

    while (true) {
      const existing = await this.activityModel.findOne({ slug }).exec();
      if (!existing || (excludeId && String(existing._id) === excludeId)) break;
      slug = `${base}-${counter++}`;
    }

    return slug;
  }

  private toObject(doc: ActivityDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
