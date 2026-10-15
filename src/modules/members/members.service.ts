import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member, MemberDocument } from '../../schemas/member.schema';
import {
  MemberApplication,
  MemberApplicationDocument,
} from '../../schemas/member-application.schema';
import { CreateMemberApplicationDto } from './dto/create-member-application.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { QueryMembersDto } from './dto/query-members.dto';

import { MailService } from '../../infrastructure/mail/mail.service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Member.name)
    private readonly memberModel: Model<MemberDocument>,

    @InjectModel(MemberApplication.name)
    private readonly applicationModel: Model<MemberApplicationDocument>,

    private readonly mailService: MailService,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

  async findPublished(query: QueryMembersDto) {
    const { page = 1, limit = 20, search, sector, sortBy = 'approvedAt', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = { status: 'APPROVED' };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ companyName: regex }, { description: regex }];
    }
    if (sector) filter['sectors'] = sector;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.memberModel
        .find(filter)
        .select('-reviewComment -reviewedBy -representativeEmail -representativeName -phone -email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.memberModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const doc = await this.memberModel
      .findOne({ slug, status: 'APPROVED' })
      .select('-reviewComment -reviewedBy -representativeEmail -representativeName -phone -email')
      .exec();

    if (!doc) throw new NotFoundException('Membre introuvable');
    return this.toObject(doc);
  }

  async submitApplication(dto: CreateMemberApplicationDto) {
    if (!dto.consent) {
      throw new BadRequestException('Le consentement est requis pour soumettre une candidature');
    }

    // Check for duplicate pending/approved application by representative email
    const existing = await this.applicationModel.findOne({
      representativeEmail: dto.representativeEmail,
      status: { $in: ['PENDING', 'APPROVED'] },
    }).exec();

    if (existing) {
      throw new ConflictException(
        'Une candidature existe déjà pour cet email représentant',
      );
    }

    const doc = await this.applicationModel.create({
      ...dto,
      sectors: dto.sectors ?? [],
      status: 'PENDING',
    });

    // Confirmation email to applicant
    void this.mailService.sendMemberApplicationConfirmation({
      to: dto.representativeEmail,
      representativeName: dto.representativeName,
      companyName: dto.companyName,
      sectors: dto.sectors ?? [],
      applicationId: String(doc._id),
    });

    return {
      applicationId: String(doc._id),
      status: doc.status,
    };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async createMember(dto: CreateMemberDto, reviewerId: string) {
    // Check for duplicate representative email
    const existing = await this.memberModel.findOne({
      representativeEmail: dto.representativeEmail,
    }).exec();

    if (existing) {
      throw new ConflictException(
        'Un membre existe déjà avec cet email représentant',
      );
    }

    const baseSlug = slugify(dto.companyName);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const doc = await this.memberModel.create({
      ...dto,
      sectors: dto.sectors ?? [],
      slug,
      status: 'APPROVED',
      approvedAt: new Date(),
      reviewedBy: reviewerId,
    });

    return this.toObject(doc);
  }

  async findById(id: string) {
    const doc = await this.memberModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Membre introuvable');
    return this.toObject(doc);
  }

  async findAllAdmin(query: QueryMembersDto) {
    const { page = 1, limit = 20, search, sector, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = {};

    if (status) filter['status'] = status;
    if (sector) filter['sectors'] = sector;

    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ companyName: regex }, { description: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.memberModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.memberModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findAllApplicationsAdmin(query: QueryMembersDto) {
    const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ companyName: regex }, { representativeName: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.applicationModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.applicationModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: string, dto: UpdateMemberStatusDto, reviewerId: string) {
    const doc = await this.memberModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Membre introuvable');

    this.validateStatusTransition(doc.status, dto.status);

    const updateData: Record<string, unknown> = {
      status: dto.status,
      reviewedBy: reviewerId,
      reviewComment: dto.reviewComment ?? null,
    };

    if (dto.status === 'APPROVED') {
      updateData['approvedAt'] = new Date();
    }

    const updated = await this.memberModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Membre introuvable');
    return this.toObject(updated);
  }

  async updateApplicationStatus(id: string, dto: UpdateMemberStatusDto, reviewerId: string) {
    const application = await this.applicationModel.findById(id).exec();
    if (!application) throw new NotFoundException('Candidature introuvable');

    this.validateStatusTransition(application.status, dto.status);

    const updateData: Record<string, unknown> = {
      status: dto.status,
      reviewedBy: reviewerId,
      reviewComment: dto.reviewComment ?? null,
      reviewedAt: new Date(),
    };

    await this.applicationModel
      .findByIdAndUpdate(id, { $set: updateData })
      .exec();

    // If approved → create member record
    if (dto.status === 'APPROVED') {
      await this.promoteApplicationToMember(application, reviewerId);
    }

    // Notification email to applicant
    void this.mailService.sendMemberApplicationReview({
      to: application.representativeEmail,
      representativeName: application.representativeName,
      companyName: application.companyName,
      approved: dto.status === 'APPROVED',
      reviewComment: dto.reviewComment,
      approvedAt: dto.status === 'APPROVED' ? new Date().toLocaleDateString('fr-FR') : undefined,
    });

    return { id, status: dto.status };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async promoteApplicationToMember(
    application: MemberApplicationDocument,
    reviewerId: string,
  ) {
    const baseSlug = slugify(application.companyName);
    const slug = await this.ensureUniqueSlug(baseSlug);

    await this.memberModel.create({
      companyName: application.companyName,
      slug,
      description: application.description,
      logoUrl: application.logoUrl,
      website: application.website,
      sectors: application.sectors ?? [],
      legalForm: application.legalForm,
      address: application.address,
      employees: application.employees,
      representativeName: application.representativeName,
      representativeEmail: application.representativeEmail,
      phone: application.phone,
      email: application.email,
      status: 'APPROVED',
      approvedAt: new Date(),
      reviewedBy: reviewerId,
    });
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (await this.memberModel.exists({ slug })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  private validateStatusTransition(current: string, next: string): void {
    const allowed: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['SUSPENDED'],
      REJECTED: [],
      SUSPENDED: ['APPROVED'],
    };

    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(
        `Transition de statut invalide : ${current} → ${next}`,
      );
    }
  }

  private toObject(doc: MemberDocument | MemberApplicationDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
