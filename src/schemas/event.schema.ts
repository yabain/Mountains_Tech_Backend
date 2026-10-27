import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventDocument = EventEntity & Document;

export class Panelist {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  role!: string;

  @Prop({ type: String })
  photoUrl?: string;
}

export const PanelistSchema = SchemaFactory.createForClass(Panelist);

@Schema({ timestamps: true })
export class EventEntity {
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

  @Prop({ type: String })
  location?: string;

  @Prop({ type: Date, required: true })
  startAt!: Date;

  @Prop({ type: Date })
  endAt?: Date;

  @Prop({ type: Boolean, default: false })
  registrationRequired!: boolean;

  @Prop({ type: Number })
  capacity?: number;

  // DRAFT | PUBLISHED | ARCHIVED
  @Prop({ type: String, default: 'DRAFT' })
  status!: string;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: String })
  createdBy?: string;

  @Prop({ type: [PanelistSchema], default: [] })
  panelists!: Panelist[];
}

export const EventSchema = SchemaFactory.createForClass(EventEntity);

EventSchema.index({ status: 1 });
EventSchema.index({ startAt: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ title: 'text', excerpt: 'text' });
