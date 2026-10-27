import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from '../../schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';

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
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

  async findPublished(query: QueryProjectsDto) {
    const { page = 1, limit = 20, search, tag, sortBy = 'publishedAt', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = { status: 'PUBLISHED' };
    if (tag) filter['tags'] = tag;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ title: regex }, { excerpt: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('partners', 'companyName slug logoUrl')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const doc = await this.projectModel
      .findOne({ slug, status: 'PUBLISHED' })
      .populate('partners', 'companyName slug logoUrl website')
      .exec();
    if (!doc) throw new NotFoundException('Projet introuvable');
    return this.toObject(doc);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async findAll(query: QueryProjectsDto) {
    const { page = 1, limit = 20, search, tag, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;
    if (tag) filter['tags'] = tag;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ title: regex }, { excerpt: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('partners', 'companyName slug logoUrl')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const doc = await this.projectModel
      .findById(id)
      .populate('partners', 'companyName slug logoUrl website')
      .exec();
    if (!doc) throw new NotFoundException('Projet introuvable');
    return this.toObject(doc);
  }

  async create(dto: CreateProjectDto, userId: string) {
    const slug = await this.resolveUniqueSlug(dto.slug ?? slugify(dto.title));
    const publishedAt = dto.status === 'PUBLISHED' ? new Date() : undefined;

    const partners = (dto.partners ?? []).map((id) => new Types.ObjectId(id));

    const doc = await this.projectModel.create({
      title: dto.title,
      slug,
      excerpt: dto.excerpt,
      coverUrl: dto.coverUrl,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      partners,
      tags: dto.tags ?? [],
      status: dto.status ?? 'DRAFT',
      publishedAt,
      createdBy: userId,
    });

    return this.toObject(doc);
  }

  async update(id: string, dto: UpdateProjectDto) {
    const doc = await this.projectModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Projet introuvable');

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
    if (dto.startDate !== undefined) updateData['startDate'] = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData['endDate'] = new Date(dto.endDate);
    if (dto.tags !== undefined) updateData['tags'] = dto.tags;
    if (dto.partners !== undefined) {
      updateData['partners'] = dto.partners.map((pid) => new Types.ObjectId(pid));
    }

    if (dto.slug && dto.slug !== doc.slug) {
      updateData['slug'] = await this.resolveUniqueSlug(dto.slug, id);
    }

    if (dto.status) {
      updateData['status'] = dto.status;
      if (dto.status === 'PUBLISHED' && !doc.publishedAt) {
        updateData['publishedAt'] = new Date();
      }
    }

    const updated = await this.projectModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('partners', 'companyName slug logoUrl')
      .exec();

    if (!updated) throw new NotFoundException('Projet introuvable');
    return this.toObject(updated);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.projectModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Projet introuvable');

    if (doc.status === 'PUBLISHED') {
      throw new BadRequestException(
        'Un projet publié ne peut pas être supprimé. Archivez-le d\'abord.',
      );
    }

    await this.projectModel.findByIdAndDelete(id).exec();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (true) {
      const existing = await this.projectModel.findOne({ slug }).exec();
      if (!existing || (excludeId && String(existing._id) === excludeId)) break;
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  private toObject(doc: ProjectDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
