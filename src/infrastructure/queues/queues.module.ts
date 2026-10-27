import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AnnouncementProcessor } from './announcement.processor';
import { ANNOUNCEMENT_QUEUE } from './queue.constants';
import { buildRedisConnection } from './redis.config';
import { Announcement, AnnouncementSchema } from '../../schemas/announcement.schema';
import { AnnouncementRecipient, AnnouncementRecipientSchema } from '../../schemas/announcement-recipient.schema';
import { NewsletterSubscriber, NewsletterSubscriberSchema } from '../../schemas/newsletter-subscriber.schema';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: ANNOUNCEMENT_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: buildRedisConnection(config),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
    }),

    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: AnnouncementRecipient.name, schema: AnnouncementRecipientSchema },
      { name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema },
    ]),
  ],
  providers: [AnnouncementProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
