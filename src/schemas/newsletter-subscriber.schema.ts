import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsletterSubscriberDocument = NewsletterSubscriber & Document;

@Schema({ timestamps: true })
export class NewsletterSubscriber {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ type: String })
  firstName?: string;

  // SUBSCRIBED | UNSUBSCRIBED
  @Prop({ type: String, default: 'SUBSCRIBED' })
  status!: string;

  @Prop({ type: Boolean, default: false })
  consent!: boolean;

  @Prop({ type: Date })
  consentAt?: Date;

  @Prop({ type: Date })
  unsubscribedAt?: Date;
}

export const NewsletterSubscriberSchema = SchemaFactory.createForClass(NewsletterSubscriber);
NewsletterSubscriberSchema.index({ status: 1 });
