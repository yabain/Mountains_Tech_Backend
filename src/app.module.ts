import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MembersModule } from './modules/members/members.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { EventsModule } from './modules/events/events.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { HackathonsModule } from './modules/hackathons/hackathons.module';
import { PartnersModule } from './modules/partners/partners.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { MediaModule } from './modules/media/media.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    UsersModule,
    AuthModule,
    MembersModule,
    ActivitiesModule,
    EventsModule,
    ProjectsModule,
    HackathonsModule,
    PartnersModule,
    NewsletterModule,
    ContactsModule,
    AnnouncementsModule,
    MediaModule,
    SettingsModule,
    DashboardModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
