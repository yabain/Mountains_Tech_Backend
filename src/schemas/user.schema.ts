import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ default: 'EDITOR' })
  role!: string;

  @Prop({ default: 'ACTIVE' })
  status!: string;

  @Prop({ type: String, default: null })
  refreshTokenHash!: string | null;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  // Password reset
  @Prop({ type: String, default: null })
  resetPasswordToken!: string | null;

  @Prop({ type: Date, default: null })
  resetPasswordExpires!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
