import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ type: String })
  excerpt?: string;

  @Prop({ type: String })
  coverUrl?: string;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  // References to partners (members) by ObjectId
  @Prop({ type: [Types.ObjectId], ref: 'Member', default: [] })
  partners!: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  tags!: string[];

  // DRAFT | PUBLISHED | ARCHIVED
  @Prop({ type: String, default: 'DRAFT' })
  status!: string;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: String })
  createdBy?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ status: 1 });
ProjectSchema.index({ tags: 1 });
ProjectSchema.index({ title: 'text', excerpt: 'text' });
