import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Media, MediaDocument } from '../../schemas/media.schema';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
  ) {}

  async findAll(page = 1, limit = 20, mimeType?: string) {
    const filter: Record<string, unknown> = {};
    if (mimeType) filter['mimeType'] = new RegExp(mimeType, 'i');
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.mediaModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.mediaModel.countDocuments(filter).exec(),
    ]);
    return {
      items: docs.map((d) => this.toObject(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async create(data: { fileName: string; mimeType: string; size?: number; url: string; alt?: string; uploadedBy: string }) {
    const doc = await this.mediaModel.create(data);
    return this.toObject(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.mediaModel.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Média introuvable');
  }

  private toObject(doc: MediaDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
