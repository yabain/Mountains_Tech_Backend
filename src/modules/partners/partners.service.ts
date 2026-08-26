import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Partner, PartnerDocument } from '../../schemas/partner.schema';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectModel(Partner.name) private readonly partnerModel: Model<PartnerDocument>,
  ) {}

  async findAll(onlyActive = false) {
    const filter = onlyActive ? { status: 'ACTIVE' } : {};
    const docs = await this.partnerModel.find(filter).sort({ order: 1, createdAt: -1 }).exec();
    return docs.map((d) => this.toObject(d));
  }

  async findById(id: string) {
    const doc = await this.partnerModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Partenaire introuvable');
    return this.toObject(doc);
  }

  async create(dto: CreatePartnerDto) {
    const doc = await this.partnerModel.create({ ...dto });
    return this.toObject(doc);
  }

  async update(id: string, dto: UpdatePartnerDto) {
    const doc = await this.partnerModel.findByIdAndUpdate(
      id, { $set: dto }, { new: true },
    ).exec();
    if (!doc) throw new NotFoundException('Partenaire introuvable');
    return this.toObject(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.partnerModel.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Partenaire introuvable');
  }

  private toObject(doc: PartnerDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
