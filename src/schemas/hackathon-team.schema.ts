import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface TeamMember {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
}

export type HackathonTeamDocument = HackathonTeam & Document;

@Schema({ timestamps: true })
export class HackathonTeam {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Hackathon' })
  hackathonId!: Types.ObjectId;

  @Prop({ required: true })
  teamName!: string;

  @Prop({ type: String })
  schoolOrOrganization?: string;

  // Leader info
  @Prop({
    type: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
    },
    required: true,
  })
  leader!: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };

  // Additional members
  @Prop({
    type: [
      {
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        role: String,
      },
    ],
    default: [],
  })
  members!: TeamMember[];

  @Prop({ type: String })
  projectIdea?: string;

  @Prop({ type: [String], default: [] })
  technologyStack!: string[];

  @Prop({ type: Boolean, default: false })
  consent!: boolean;

  // PENDING | APPROVED | REJECTED
  @Prop({ type: String, default: 'PENDING' })
  status!: string;

  @Prop({ type: String })
  reviewComment?: string;

  @Prop({ type: String })
  reviewedBy?: string;

  @Prop({ type: Date })
  reviewedAt?: Date;
}

export const HackathonTeamSchema = SchemaFactory.createForClass(HackathonTeam);

HackathonTeamSchema.index({ hackathonId: 1 });
HackathonTeamSchema.index({ status: 1 });
HackathonTeamSchema.index({ 'leader.email': 1 });
HackathonTeamSchema.index({ hackathonId: 1, teamName: 1 }, { unique: true });
