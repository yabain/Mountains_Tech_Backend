import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  message!: string;

  // NEW | IN_PROGRESS | RESOLVED | SPAM
  @Prop({ type: String, default: 'NEW' })
  status!: string;

  @Prop({ type: String })
  handledBy?: string;

  @Prop({ type: Date })
  handledAt?: Date;

  @Prop({ type: Boolean, default: false })
  consent!: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
ContactSchema.index({ status: 1 });
ContactSchema.index({ email: 1 });
