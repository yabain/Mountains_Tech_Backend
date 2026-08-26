import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MemberDocument = Member & Document;

@Schema({ timestamps: true })
export class Member {
  @Prop({ required: true })
  companyName!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  logoUrl?: string;

  @Prop({ type: String })
  website?: string;

  @Prop({ type: [String], default: [] })
  sectors!: string[];

  @Prop({ type: String })
  legalForm?: string;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: Number })
  employees?: number;

  // Contact principal
  @Prop({ type: String, required: true })
  representativeName!: string;

  @Prop({ type: String, required: true })
  representativeEmail!: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  email?: string;

  // Statut : PENDING → APPROVED / REJECTED ; APPROVED → SUSPENDED
  @Prop({ type: String, default: 'PENDING' })
  status!: string;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: String })
  reviewComment?: string;

  @Prop({ type: String })
  reviewedBy?: string;
}

export const MemberSchema = SchemaFactory.createForClass(Member);

// Index pour la recherche et le tri
MemberSchema.index({ slug: 1 });
MemberSchema.index({ status: 1 });
MemberSchema.index({ sectors: 1 });
MemberSchema.index({ companyName: 'text', description: 'text' });
