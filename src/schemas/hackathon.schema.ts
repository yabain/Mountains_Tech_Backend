import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HackathonDocument = Hackathon & Document;

@Schema({ timestamps: true })
export class Hackathon {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  coverUrl?: string;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: Date })
  registrationDeadline?: Date;

  @Prop({ type: Number })
  maxTeamSize?: number;

  @Prop({ type: Number })
  minTeamSize?: number;

  @Prop({ type: [String], default: [] })
  themes!: string[];

  @Prop({ type: [String], default: [] })
  prizes!: string[];

  // DRAFT | PUBLISHED | ARCHIVED
  @Prop({ type: String, default: 'DRAFT' })
  status!: string;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: String })
  createdBy?: string;
}

export const HackathonSchema = SchemaFactory.createForClass(Hackathon);

HackathonSchema.index({ status: 1 });
HackathonSchema.index({ title: 'text', description: 'text' });
