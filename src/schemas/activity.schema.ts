import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ type: String })
  excerpt?: string;

  @Prop({ type: String })
  coverUrl?: string;

  @Prop({ type: String })
  category?: string;

  @Prop({ type: String, default: 'DRAFT' })
  status!: string; // DRAFT | PUBLISHED | ARCHIVED

  // Optional publication dates
  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: String })
  createdBy?: string; // userId
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

ActivitySchema.index({ slug: 1 });
ActivitySchema.index({ status: 1 });
ActivitySchema.index({ category: 1 });
ActivitySchema.index({ title: 'text', excerpt: 'text' });
