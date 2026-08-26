import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MemberApplicationDocument = MemberApplication & Document;

@Schema({ timestamps: true })
export class MemberApplication {
  // Company data
  @Prop({ required: true })
  companyName!: string;

  @Prop({ type: String })
  legalForm?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  website?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: String })
  logoUrl?: string;

  @Prop({ type: [String], default: [] })
  sectors!: string[];

  @Prop({ type: Number })
  employees?: number;

  // Applicant (representative)
  @Prop({ required: true })
  representativeName!: string;

  @Prop({ required: true })
  representativeEmail!: string;

  // Consent
  @Prop({ required: true })
  consent!: boolean;

  // Review
  @Prop({ type: String, default: 'PENDING' })
  status!: string;

  @Prop({ type: String })
  reviewComment?: string;

  @Prop({ type: String })
  reviewedBy?: string;

  @Prop({ type: Date })
  reviewedAt?: Date;
}

export const MemberApplicationSchema = SchemaFactory.createForClass(MemberApplication);

MemberApplicationSchema.index({ status: 1 });
MemberApplicationSchema.index({ representativeEmail: 1 });
