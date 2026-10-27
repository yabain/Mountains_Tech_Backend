import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ type: String })
  userId?: string;

  @Prop({ type: String })
  userEmail?: string;

  @Prop({ type: String })
  userName?: string; // snapshot: "firstName lastName" au moment de l'action

  @Prop({ required: true })
  action!: string; // e.g. CREATE, UPDATE, DELETE, LOGIN, LOGOUT

  @Prop({ required: true })
  resource!: string; // e.g. users, members, activities

  @Prop({ type: String })
  resourceId?: string;

  @Prop({ type: String })
  category?: string;

  @Prop({ type: String })
  method?: string;

  @Prop({ type: String })
  path?: string;

  @Prop({ type: Number })
  statusCode?: number;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: String })
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ resource: 1, action: 1 });
AuditLogSchema.index({ category: 1 });
AuditLogSchema.index({ method: 1 });
AuditLogSchema.index({ statusCode: 1 });
AuditLogSchema.index({ createdAt: -1 });

