/**
 * Abstract interface for the announcement queue.
 * Concrete implementations: BullAnnouncementQueueService (Redis) and
 * NoopAnnouncementQueueService (in-memory, no Redis dependency).
 *
 * Inject ANNOUNCEMENT_QUEUE_SERVICE wherever you need to enqueue jobs.
 */

import { Logger } from '@nestjs/common';
import { AnnouncementJobs } from './queue.constants';

export const ANNOUNCEMENT_QUEUE_SERVICE = 'ANNOUNCEMENT_QUEUE_SERVICE';

export interface EnqueueResult {
  jobId: string | undefined;
  status: string;
  message: string;
}

export interface IAnnouncementQueueService {
  /**
   * Enqueue an immediate send job.
   */
  sendNow(announcementId: string): Promise<EnqueueResult>;

  /**
   * Enqueue a delayed (scheduled) send job.
   */
  sendScheduled(announcementId: string, sendAt: Date): Promise<EnqueueResult>;

  /**
   * Remove a previously scheduled job.
   * Returns true if the job was found and removed.
   */
  cancelJob(jobId: string): Promise<boolean>;
}

// ─── Bull implementation ──────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ANNOUNCEMENT_QUEUE } from './queue.constants';
import type { AnnouncementJobData } from './announcement.processor';

@Injectable()
export class BullAnnouncementQueueService implements IAnnouncementQueueService {
  constructor(
    @InjectQueue(ANNOUNCEMENT_QUEUE)
    private readonly queue: Queue<AnnouncementJobData>,
  ) {}

  async sendNow(announcementId: string): Promise<EnqueueResult> {
    const job = await this.queue.add(
      AnnouncementJobs.SEND_NOW,
      { announcementId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
    return {
      jobId: job.id,
      status: 'PROCESSING',
      message: "Campagne ajoutée à la file d'envoi",
    };
  }

  async sendScheduled(announcementId: string, sendAt: Date): Promise<EnqueueResult> {
    const delay = sendAt.getTime() - Date.now();
    const job = await this.queue.add(
      AnnouncementJobs.SEND_SCHEDULED,
      { announcementId },
      {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
    return {
      jobId: job.id,
      status: 'SCHEDULED',
      message: 'Campagne programmée',
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    return true;
  }
}

// ─── Noop implementation (no Redis) ──────────────────────────────────────────

@Injectable()
export class NoopAnnouncementQueueService implements IAnnouncementQueueService {
  private readonly logger = new Logger(NoopAnnouncementQueueService.name);

  async sendNow(announcementId: string): Promise<EnqueueResult> {
    this.logger.warn(
      `QUEUE_DRIVER is not "redis" — announcement ${announcementId} was NOT queued. ` +
        'Set QUEUE_DRIVER=redis to enable background sending.',
    );
    return {
      jobId: undefined,
      status: 'QUEUED_NOOP',
      message:
        "File d'attente désactivée (QUEUE_DRIVER≠redis). " +
        "L'annonce a été créée mais aucun email ne sera envoyé.",
    };
  }

  async sendScheduled(announcementId: string, sendAt: Date): Promise<EnqueueResult> {
    this.logger.warn(
      `QUEUE_DRIVER is not "redis" — scheduled announcement ${announcementId} (${sendAt.toISOString()}) was NOT queued.`,
    );
    return {
      jobId: undefined,
      status: 'SCHEDULED_NOOP',
      message:
        "File d'attente désactivée (QUEUE_DRIVER≠redis). " +
        "L'annonce a été sauvegardée mais ne sera pas envoyée automatiquement.",
    };
  }

  async cancelJob(_jobId: string): Promise<boolean> {
    // Nothing to cancel — noop never creates jobs
    return true;
  }
}
