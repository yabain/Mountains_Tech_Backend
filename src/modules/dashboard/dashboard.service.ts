import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Member, MemberDocument } from '../../schemas/member.schema';
import { MemberApplication, MemberApplicationDocument } from '../../schemas/member-application.schema';
import { Activity, ActivityDocument } from '../../schemas/activity.schema';
import { EventEntity, EventDocument } from '../../schemas/event.schema';
import { EventRegistration, EventRegistrationDocument } from '../../schemas/event-registration.schema';
import { Project, ProjectDocument } from '../../schemas/project.schema';
import { Hackathon, HackathonDocument } from '../../schemas/hackathon.schema';
import { HackathonTeam, HackathonTeamDocument } from '../../schemas/hackathon-team.schema';
import { NewsletterSubscriber, NewsletterSubscriberDocument } from '../../schemas/newsletter-subscriber.schema';
import { Contact, ContactDocument } from '../../schemas/contact.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Member.name) private memberModel: Model<MemberDocument>,
    @InjectModel(MemberApplication.name) private applicationModel: Model<MemberApplicationDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(EventEntity.name) private eventModel: Model<EventDocument>,
    @InjectModel(EventRegistration.name) private registrationModel: Model<EventRegistrationDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Hackathon.name) private hackathonModel: Model<HackathonDocument>,
    @InjectModel(HackathonTeam.name) private teamModel: Model<HackathonTeamDocument>,
    @InjectModel(NewsletterSubscriber.name) private subscriberModel: Model<NewsletterSubscriberDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
  ) {}

  async getStats() {
    const [
      totalUsers, activeUsers,
      totalMembers, approvedMembers, pendingApplications,
      totalActivities, publishedActivities,
      totalEvents, publishedEvents, totalRegistrations,
      totalProjects, publishedProjects,
      totalHackathons, pendingTeams,
      totalSubscribers, activeSubscribers,
      totalContacts, newContacts,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ status: 'ACTIVE' }),
      this.memberModel.countDocuments(),
      this.memberModel.countDocuments({ status: 'APPROVED' }),
      this.applicationModel.countDocuments({ status: 'PENDING' }),
      this.activityModel.countDocuments(),
      this.activityModel.countDocuments({ status: 'PUBLISHED' }),
      this.eventModel.countDocuments(),
      this.eventModel.countDocuments({ status: 'PUBLISHED' }),
      this.registrationModel.countDocuments(),
      this.projectModel.countDocuments(),
      this.projectModel.countDocuments({ status: 'PUBLISHED' }),
      this.hackathonModel.countDocuments(),
      this.teamModel.countDocuments({ status: 'PENDING' }),
      this.subscriberModel.countDocuments(),
      this.subscriberModel.countDocuments({ status: 'SUBSCRIBED' }),
      this.contactModel.countDocuments(),
      this.contactModel.countDocuments({ status: 'NEW' }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers },
      members: { total: totalMembers, approved: approvedMembers, pendingApplications },
      activities: { total: totalActivities, published: publishedActivities },
      events: { total: totalEvents, published: publishedEvents, totalRegistrations },
      projects: { total: totalProjects, published: publishedProjects },
      hackathons: { total: totalHackathons, pendingTeams },
      newsletter: { total: totalSubscribers, active: activeSubscribers },
      contacts: { total: totalContacts, new: newContacts },
    };
  }
}
