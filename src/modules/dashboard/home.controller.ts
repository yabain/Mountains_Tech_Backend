import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Activity, ActivityDocument } from '../../schemas/activity.schema';
import { EventEntity, EventDocument } from '../../schemas/event.schema';
import { Project, ProjectDocument } from '../../schemas/project.schema';
import { Member, MemberDocument } from '../../schemas/member.schema';
import { Partner, PartnerDocument } from '../../schemas/partner.schema';

@ApiTags('Public - Accueil')
@Controller('public/home')
export class HomeController {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(EventEntity.name) private eventModel: Model<EventDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Member.name) private memberModel: Model<MemberDocument>,
    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Agrégat page d\'accueil',
    description: 'Retourne les dernières activités, événements à venir, projets, membres et partenaires pour la page d\'accueil.',
  })
  @ApiResponse({ status: 200, description: 'Données accueil récupérées' })
  async home() {
    const [activities, events, projects, members, partners] = await Promise.all([
      this.activityModel.find({ status: 'PUBLISHED' }).sort({ publishedAt: -1 }).limit(6).exec(),
      this.eventModel.find({ status: 'PUBLISHED', startAt: { $gte: new Date() } }).sort({ startAt: 1 }).limit(4).exec(),
      this.projectModel.find({ status: 'PUBLISHED' }).sort({ publishedAt: -1 }).limit(6).exec(),
      this.memberModel.find({ status: 'APPROVED' }).sort({ approvedAt: -1 }).limit(8).select('companyName slug logoUrl sectors').exec(),
      this.partnerModel.find({ status: 'ACTIVE' }).sort({ order: 1 }).exec(),
    ]);

    return {
      success: true,
      data: {
        activities: activities.map((d) => { const o = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>; delete o['__v']; return o; }),
        events: events.map((d) => { const o = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>; delete o['__v']; return o; }),
        projects: projects.map((d) => { const o = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>; delete o['__v']; return o; }),
        members: members.map((d) => { const o = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>; delete o['__v']; return o; }),
        partners: partners.map((d) => { const o = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>; delete o['__v']; return o; }),
      },
      message: 'Données accueil récupérées',
    };
  }
}
