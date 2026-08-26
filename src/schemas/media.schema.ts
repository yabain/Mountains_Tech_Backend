import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true })
export class Media {
  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ type: Number })
  size?: number;

  @Prop({ required: true })
  url!: string;

  @Prop({ type: String })
  alt?: string;

  @Prop({ type: String })
  uploadedBy?: string;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
MediaSchema.index({ mimeType: 1 });
