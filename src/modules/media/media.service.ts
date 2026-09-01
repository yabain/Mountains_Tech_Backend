import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Media, MediaDocument } from '../../schemas/media.schema';
import { StorageService } from '../../infrastructure/storage/storage.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    private readonly storageService: StorageService,
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

  async create(data: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
    alt?: string;
    uploadedBy: string;
  }) {
    const { url, fileName } = this.storageService.save(
      data.buffer,
      data.originalName,
      data.mimeType,
      data.size,
    );

    const doc = await this.mediaModel.create({
      fileName,
      mimeType: data.mimeType,
      size: data.size,
      url,
      alt: data.alt,
      uploadedBy: data.uploadedBy,
    });

    return this.toObject(doc);
  }

  async update(id: string, data: { alt?: string }) {
    const doc = await this.mediaModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException('Média introuvable');
    return this.toObject(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.mediaModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Média introuvable');

    this.storageService.delete(doc.fileName);
    await this.mediaModel.findByIdAndDelete(id).exec();
  }

  private toObject(doc: MediaDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
}
