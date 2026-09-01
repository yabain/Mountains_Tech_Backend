import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { Announcement, AnnouncementSchema } from '../../schemas/announcement.schema';
import { NewsletterSubscriber, NewsletterSubscriberSchema } from '../../schemas/newsletter-subscriber.schema';
import { NewsletterModule } from '../newsletter/newsletter.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema },
    ]),
    NewsletterModule,
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
