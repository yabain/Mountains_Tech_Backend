import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument } from '../../schemas/contact.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['IN_PROGRESS', 'SPAM'],
  IN_PROGRESS: ['RESOLVED', 'SPAM'],
  RESOLVED: [],
  SPAM: [],
};

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private readonly contactModel: Model<ContactDocument>,
  ) {}

  async create(dto: CreateContactDto) {
    if (!dto.consent) throw new BadRequestException('Le consentement est requis');
    const doc = await this.contactModel.create({ ...dto });
    return { messageId: String(doc._id) };
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.contactModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.contactModel.countDocuments(filter).exec(),
    ]);
    return {
      items: docs.map((d) => { const o = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>; delete o['__v']; return o; }),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: string, dto: UpdateContactStatusDto, handledBy: string) {
    const doc = await this.contactModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Message introuvable');

    const allowed = STATUS_TRANSITIONS[doc.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Transition invalide : ${doc.status} → ${dto.status}`);
    }

    const updated = await this.contactModel.findByIdAndUpdate(
      id,
      { $set: { status: dto.status, handledBy, handledAt: new Date() } },
      { new: true },
    ).exec();

    if (!updated) throw new NotFoundException('Message introuvable');
    const obj = updated.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
