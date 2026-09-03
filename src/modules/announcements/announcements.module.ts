import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { Announcement, AnnouncementSchema } from '../../schemas/announcement.schema';
import { AnnouncementRecipient, AnnouncementRecipientSchema } from '../../schemas/announcement-recipient.schema';
import { NewsletterSubscriber, NewsletterSubscriberSchema } from '../../schemas/newsletter-subscriber.schema';
import { ANNOUNCEMENT_QUEUE } from '../../infrastructure/queues/queue.constants';
import { buildRedisConnection } from '../../infrastructure/queues/redis.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: AnnouncementRecipient.name, schema: AnnouncementRecipientSchema },
      { name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema },
    ]),
    BullModule.registerQueueAsync({
      name: ANNOUNCEMENT_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: buildRedisConnection(config),
      }),
    }),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
