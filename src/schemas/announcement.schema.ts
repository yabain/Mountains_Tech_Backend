import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface AnnouncementAudience {
  groups: string[];
  filters?: Record<string, unknown>;
}

export interface AnnouncementMetrics {
  sent: number;
  failed: number;
  opened?: number;
  clicked?: number;
}

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  contentHtml!: string;

  @Prop({ type: Object, required: true })
  audience!: AnnouncementAudience;

  // NOW | SCHEDULED
  @Prop({ type: String, default: 'NOW' })
  sendMode!: string;

  @Prop({ type: Date })
  scheduledAt?: Date;

  // DRAFT | SCHEDULED | PROCESSING | SENT | FAILED | CANCELLED
  @Prop({ type: String, default: 'DRAFT' })
  status!: string;

  @Prop({ type: Number, default: 0 })
  recipientCount!: number;

  @Prop({ type: Object, default: { sent: 0, failed: 0 } })
  metrics!: AnnouncementMetrics;

  @Prop({ type: String })
  createdBy?: string;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
AnnouncementSchema.index({ status: 1 });
AnnouncementSchema.index({ scheduledAt: 1 });
