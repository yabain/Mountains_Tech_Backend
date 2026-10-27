import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingDocument = Setting & Document;

@Schema({ timestamps: true })
export class Setting {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ type: Object, required: true })
  value!: unknown;

  @Prop({ type: Boolean, default: false })
  isPublic!: boolean;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
SettingSchema.index({ isPublic: 1 });
