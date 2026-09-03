import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';
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
import { StorageModule } from './infrastructure/storage/storage.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { AuditModule } from './infrastructure/audit/audit.module';
import { QueuesModule } from './infrastructure/queues/queues.module';
import { buildRedisConnection } from './infrastructure/queues/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ─── Serve uploads folder as static files ─────────────────────────────────
    // Files accessible at: http://localhost:3000/uploads/<filename>
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    // ─── BullMQ root connection ───────────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: buildRedisConnection(config),
      }),
    }),

    StorageModule,
    MailModule,
    AuditModule,
    QueuesModule,
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
