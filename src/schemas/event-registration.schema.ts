import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventRegistrationDocument = EventRegistration & Document;

@Schema({ timestamps: true })
export class EventRegistration {
  @Prop({ type: Types.ObjectId, required: true, ref: 'EventEntity' })
  eventId!: Types.ObjectId;

  // Participant info (no auth required - public registration)
  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  organization?: string;

  // PENDING | CONFIRMED | CANCELLED
  @Prop({ type: String, default: 'CONFIRMED' })
  status!: string;

  @Prop({ type: Boolean, default: false })
  consent!: boolean;
}

export const EventRegistrationSchema = SchemaFactory.createForClass(EventRegistration);

EventRegistrationSchema.index({ eventId: 1 });
EventRegistrationSchema.index({ email: 1 });
EventRegistrationSchema.index({ eventId: 1, email: 1 }, { unique: true });
