import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Hackathon, HackathonDocument } from '../../schemas/hackathon.schema';
import { HackathonTeam, HackathonTeamDocument } from '../../schemas/hackathon-team.schema';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import { UpdateHackathonDto } from './dto/update-hackathon.dto';
import { RegisterTeamDto } from './dto/register-team.dto';
import { UpdateTeamStatusDto } from './dto/update-team-status.dto';
import { QueryHackathonsDto } from './dto/query-hackathons.dto';

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
export class HackathonsService {
  constructor(
    @InjectModel(Hackathon.name)
    private readonly hackathonModel: Model<HackathonDocument>,

    @InjectModel(HackathonTeam.name)
    private readonly teamModel: Model<HackathonTeamDocument>,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

  async findPublished(query: QueryHackathonsDto) {
    const { page = 1, limit = 20, search, sortBy = 'startDate', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = { status: 'PUBLISHED' };
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ title: regex }, { description: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.hackathonModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.hackathonModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const doc = await this.hackathonModel.findOne({ slug, status: 'PUBLISHED' }).exec();
    if (!doc) throw new NotFoundException('Hackathon introuvable');
    return this.toObject(doc);
  }

  async registerTeam(hackathonId: string, dto: RegisterTeamDto) {
    if (!dto.consent) {
      throw new BadRequestException('Le consentement est requis pour inscrire une équipe');
    }

    const hackathon = await this.hackathonModel.findById(hackathonId).exec();
    if (!hackathon) throw new NotFoundException('Hackathon introuvable');
    if (hackathon.status !== 'PUBLISHED') {
      throw new BadRequestException('Les inscriptions ne sont pas ouvertes pour ce hackathon');
    }

    // Check registration deadline
    if (hackathon.registrationDeadline && new Date() > hackathon.registrationDeadline) {
      throw new BadRequestException('La date limite d\'inscription est dépassée');
    }

    // Check team size constraints
    const totalMembers = 1 + (dto.members?.length ?? 0); // leader + members
    if (hackathon.minTeamSize && totalMembers < hackathon.minTeamSize) {
      throw new BadRequestException(
        `L\'équipe doit comporter au moins ${hackathon.minTeamSize} membre(s)`,
      );
    }
    if (hackathon.maxTeamSize && totalMembers > hackathon.maxTeamSize) {
      throw new BadRequestException(
        `L\'équipe ne peut pas dépasser ${hackathon.maxTeamSize} membre(s)`,
      );
    }

    // Check duplicate team name for this hackathon
    const existing = await this.teamModel
      .findOne({ hackathonId: new Types.ObjectId(hackathonId), teamName: dto.teamName })
      .exec();
    if (existing) {
      throw new ConflictException('Ce nom d\'équipe est déjà utilisé pour ce hackathon');
    }

    const doc = await this.teamModel.create({
      hackathonId: new Types.ObjectId(hackathonId),
      teamName: dto.teamName,
      schoolOrOrganization: dto.schoolOrOrganization,
      leader: dto.leader,
      members: dto.members ?? [],
      projectIdea: dto.projectIdea,
      technologyStack: dto.technologyStack ?? [],
      consent: dto.consent,
      status: 'PENDING',
    });

    return { teamId: String(doc._id), status: doc.status };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async findAll(query: QueryHackathonsDto) {
    const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ title: regex }, { description: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.hackathonModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.hackathonModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const doc = await this.hackathonModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Hackathon introuvable');
    return this.toObject(doc);
  }

  async create(dto: CreateHackathonDto, userId: string) {
    const slug = await this.resolveUniqueSlug(dto.slug ?? slugify(dto.title));
    const publishedAt = dto.status === 'PUBLISHED' ? new Date() : undefined;

    const doc = await this.hackathonModel.create({
      title: dto.title,
      slug,
      description: dto.description,
      rulesHtml: dto.rulesHtml,
      coverUrl: dto.coverUrl,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : undefined,
      maxTeamSize: dto.maxTeamSize,
      minTeamSize: dto.minTeamSize,
      themes: dto.themes ?? [],
      prizes: dto.prizes ?? [],
      status: dto.status ?? 'DRAFT',
      publishedAt,
      createdBy: userId,
    });

    return this.toObject(doc);
  }

  async update(id: string, dto: UpdateHackathonDto) {
    const doc = await this.hackathonModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Hackathon introuvable');

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
    if (dto.description !== undefined) updateData['description'] = dto.description;
    if (dto.rulesHtml !== undefined) updateData['rulesHtml'] = dto.rulesHtml;
    if (dto.coverUrl !== undefined) updateData['coverUrl'] = dto.coverUrl;
    if (dto.startDate !== undefined) updateData['startDate'] = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData['endDate'] = new Date(dto.endDate);
    if (dto.registrationDeadline !== undefined) updateData['registrationDeadline'] = new Date(dto.registrationDeadline);
    if (dto.maxTeamSize !== undefined) updateData['maxTeamSize'] = dto.maxTeamSize;
    if (dto.minTeamSize !== undefined) updateData['minTeamSize'] = dto.minTeamSize;
    if (dto.themes !== undefined) updateData['themes'] = dto.themes;
    if (dto.prizes !== undefined) updateData['prizes'] = dto.prizes;

    if (dto.slug && dto.slug !== doc.slug) {
      updateData['slug'] = await this.resolveUniqueSlug(dto.slug, id);
    }

    if (dto.status) {
      updateData['status'] = dto.status;
      if (dto.status === 'PUBLISHED' && !doc.publishedAt) {
        updateData['publishedAt'] = new Date();
      }
    }

    const updated = await this.hackathonModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Hackathon introuvable');
    return this.toObject(updated);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.hackathonModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Hackathon introuvable');

    if (doc.status === 'PUBLISHED') {
      throw new BadRequestException(
        'Un hackathon publié ne peut pas être supprimé. Archivez-le d\'abord.',
      );
    }

    await this.hackathonModel.findByIdAndDelete(id).exec();
  }

  async findTeams(hackathonId: string, page = 1, limit = 20, status?: string) {
    const hackathon = await this.hackathonModel.findById(hackathonId).exec();
    if (!hackathon) throw new NotFoundException('Hackathon introuvable');

    const filter: Record<string, unknown> = {
      hackathonId: new Types.ObjectId(hackathonId),
    };
    if (status) filter['status'] = status;

    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      this.teamModel.find(filter).skip(skip).limit(limit).exec(),
      this.teamModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async updateTeamStatus(teamId: string, dto: UpdateTeamStatusDto, reviewerId: string) {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) throw new NotFoundException('Équipe introuvable');

    if (team.status !== 'PENDING') {
      throw new BadRequestException(
        `Cette équipe a déjà été traitée (statut actuel : ${team.status})`,
      );
    }

    await this.teamModel.findByIdAndUpdate(teamId, {
      $set: {
        status: dto.status,
        reviewComment: dto.reviewComment ?? null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    }).exec();

    return { teamId, status: dto.status };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (true) {
      const existing = await this.hackathonModel.findOne({ slug }).exec();
      if (!existing || (excludeId && String(existing._id) === excludeId)) break;
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  private toObject(doc: HackathonDocument | HackathonTeamDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
