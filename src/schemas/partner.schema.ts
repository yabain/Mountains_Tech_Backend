import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PartnerDocument = Partner & Document;

@Schema({ timestamps: true })
export class Partner {
  @Prop({ required: true })
  name!: string;

  @Prop({ type: String })
  logoUrl?: string;

  @Prop({ type: String })
  website?: string;

  @Prop({ type: String })
  description?: string;

  // INSTITUTIONAL | TECHNICAL | FINANCIAL | MEDIA
  @Prop({ type: String })
  type?: string;

  // ACTIVE | INACTIVE
  @Prop({ type: String, default: 'ACTIVE' })
  status!: string;

  @Prop({ type: Number, default: 0 })
  order!: number;
}

export const PartnerSchema = SchemaFactory.createForClass(Partner);
PartnerSchema.index({ status: 1, order: 1 });
