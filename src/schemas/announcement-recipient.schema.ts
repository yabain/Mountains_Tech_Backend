import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnnouncementRecipientDocument = AnnouncementRecipient & Document;

@Schema({ timestamps: { createdAt: 'sentAt', updatedAt: false } })
export class AnnouncementRecipient {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Announcement' })
  announcementId!: Types.ObjectId;

  @Prop({ required: true })
  email!: string;

  @Prop({ type: String })
  firstName?: string;

  // PENDING | SENT | FAILED
  @Prop({ type: String, default: 'PENDING' })
  status!: string;

  @Prop({ type: String })
  error?: string;
}

export const AnnouncementRecipientSchema = SchemaFactory.createForClass(AnnouncementRecipient);

AnnouncementRecipientSchema.index({ announcementId: 1 });
AnnouncementRecipientSchema.index({ announcementId: 1, email: 1 }, { unique: true });
AnnouncementRecipientSchema.index({ status: 1 });
