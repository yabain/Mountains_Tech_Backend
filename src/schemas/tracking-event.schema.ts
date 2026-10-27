import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrackingEventDocument = TrackingEvent & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class TrackingEvent {
  @Prop({ required: true, index: true })
  visitorId!: string;

  @Prop({ type: String })
  sessionId?: string;

  @Prop({ required: true })
  page!: string;

  @Prop({ type: String })
  referer?: string;

  @Prop({ type: String })
  event?: string; // page_view, click, form_submit, etc.

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const TrackingEventSchema = SchemaFactory.createForClass(TrackingEvent);
TrackingEventSchema.index({ createdAt: -1 });
TrackingEventSchema.index({ visitorId: 1, createdAt: -1 });
TrackingEventSchema.index({ page: 1 });
TrackingEventSchema.index({ event: 1 });
