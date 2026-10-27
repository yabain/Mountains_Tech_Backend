import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type EventDocument = EventEntity & Document;

/**
 * Panéliste d'un événement. Objet simple embarqué dans le document Event
 * (pas de sous-document Mongoose distinct, pas de _id par panéliste).
 */
export interface Panelist {
  name: string;
  role: string;
  photoUrl?: string;
}

const PanelistSubSchema = new MongooseSchema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    photoUrl: { type: String },
  },
  { _id: false },
);

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

  @Prop({ type: [PanelistSubSchema], default: [] })
  panelists!: Panelist[];
}

export const EventSchema = SchemaFactory.createForClass(EventEntity);

EventSchema.index({ slug: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ startAt: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ title: 'text', excerpt: 'text' });
