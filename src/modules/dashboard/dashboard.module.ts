import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { HomeController } from './home.controller';
import { Partner, PartnerSchema } from '../../schemas/partner.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Member, MemberSchema } from '../../schemas/member.schema';
import { MemberApplication, MemberApplicationSchema } from '../../schemas/member-application.schema';
import { Activity, ActivitySchema } from '../../schemas/activity.schema';
import { EventEntity, EventSchema } from '../../schemas/event.schema';
import { EventRegistration, EventRegistrationSchema } from '../../schemas/event-registration.schema';
import { Project, ProjectSchema } from '../../schemas/project.schema';
import { Hackathon, HackathonSchema } from '../../schemas/hackathon.schema';
import { HackathonTeam, HackathonTeamSchema } from '../../schemas/hackathon-team.schema';
import { NewsletterSubscriber, NewsletterSubscriberSchema } from '../../schemas/newsletter-subscriber.schema';
import { Contact, ContactSchema } from '../../schemas/contact.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Member.name, schema: MemberSchema },
      { name: MemberApplication.name, schema: MemberApplicationSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: EventEntity.name, schema: EventSchema },
      { name: EventRegistration.name, schema: EventRegistrationSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Hackathon.name, schema: HackathonSchema },
      { name: HackathonTeam.name, schema: HackathonTeamSchema },
      { name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Partner.name, schema: PartnerSchema },
    ]),
  ],
  controllers: [DashboardController, HomeController],
  providers: [DashboardService],
})
export class DashboardModule {}
