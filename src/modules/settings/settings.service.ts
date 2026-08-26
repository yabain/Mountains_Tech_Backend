import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from '../../schemas/setting.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name) private readonly settingModel: Model<SettingDocument>,
  ) {}

  async findPublic(): Promise<Record<string, unknown>> {
    const docs = await this.settingModel.find({ isPublic: true }).exec();
    return docs.reduce((acc, d) => ({ ...acc, [d.key]: d.value }), {} as Record<string, unknown>);
  }

  async findAll(): Promise<Record<string, unknown>> {
    const docs = await this.settingModel.find().exec();
    return docs.reduce((acc, d) => ({ ...acc, [d.key]: d.value }), {} as Record<string, unknown>);
  }

  async upsertMany(settings: Record<string, unknown>, isPublic = false): Promise<Record<string, unknown>> {
    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value, isPublic } },
        upsert: true,
      },
    }));
    if (ops.length > 0) await this.settingModel.bulkWrite(ops);
    return this.findAll();
  }

  async get(key: string): Promise<unknown> {
    const doc = await this.settingModel.findOne({ key }).exec();
    if (!doc) throw new NotFoundException(`Paramètre '${key}' introuvable`);
    return doc.value;
  }
}
