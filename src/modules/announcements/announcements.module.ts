import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { Announcement, AnnouncementSchema } from '../../schemas/announcement.schema';
import {
  AnnouncementRecipient,
  AnnouncementRecipientSchema,
} from '../../schemas/announcement-recipient.schema';
import {
  NewsletterSubscriber,
  NewsletterSubscriberSchema,
} from '../../schemas/newsletter-subscriber.schema';
import { QueuesModule } from '../../infrastructure/queues/queues.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: AnnouncementRecipient.name, schema: AnnouncementRecipientSchema },
      { name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema },
    ]),
    // QueuesModule exposes ANNOUNCEMENT_QUEUE_SERVICE — Bull or Noop depending on QUEUE_DRIVER
    QueuesModule.register(),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
