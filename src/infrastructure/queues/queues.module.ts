import { DynamicModule, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AnnouncementProcessor } from './announcement.processor';
import { ANNOUNCEMENT_QUEUE } from './queue.constants';
import { buildRedisConnection } from './redis.config';
import {
  ANNOUNCEMENT_QUEUE_SERVICE,
  BullAnnouncementQueueService,
  NoopAnnouncementQueueService,
} from './announcement-queue.service';

import { Announcement, AnnouncementSchema } from '../../schemas/announcement.schema';
import {
  AnnouncementRecipient,
  AnnouncementRecipientSchema,
} from '../../schemas/announcement-recipient.schema';
import {
  NewsletterSubscriber,
  NewsletterSubscriberSchema,
} from '../../schemas/newsletter-subscriber.schema';

/**
 * QueuesModule selects its implementation at startup based on QUEUE_DRIVER.
 *
 *   QUEUE_DRIVER=redis  → BullMQ + Redis (full background processing)
 *   QUEUE_DRIVER=<anything else or missing>  → Noop (no Redis, no crash)
 *
 * It is a flat DynamicModule: all providers live directly inside it so NestJS
 * can validate the exports without the "not part of this module" error that
 * occurs when re-exporting a token from a nested DynamicModule.
 */
@Module({})
export class QueuesModule {
  static register(): DynamicModule {
    const logger = new Logger('QueuesModule');
    const useRedis = process.env.QUEUE_DRIVER === 'redis';

    logger.log(
      useRedis
        ? 'QUEUE_DRIVER=redis → BullMQ worker enabled'
        : `QUEUE_DRIVER=${process.env.QUEUE_DRIVER ?? 'none'} → queue disabled (noop). Set QUEUE_DRIVER=redis to enable.`,
    );

    if (useRedis) {
      return {
        module: QueuesModule,
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
              defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: 100,
                removeOnFail: 50,
              },
            }),
          }),
        ],
        providers: [
          AnnouncementProcessor,
          BullAnnouncementQueueService,
          {
            provide: ANNOUNCEMENT_QUEUE_SERVICE,
            useExisting: BullAnnouncementQueueService,
          },
        ],
        exports: [ANNOUNCEMENT_QUEUE_SERVICE],
      };
    }

    // Noop path — zero Redis dependency
    return {
      module: QueuesModule,
      providers: [
        NoopAnnouncementQueueService,
        {
          provide: ANNOUNCEMENT_QUEUE_SERVICE,
          useExisting: NoopAnnouncementQueueService,
        },
      ],
      exports: [ANNOUNCEMENT_QUEUE_SERVICE],
    };
  }
}
