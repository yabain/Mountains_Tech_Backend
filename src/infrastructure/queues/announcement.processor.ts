import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model, Types } from 'mongoose';
import { ANNOUNCEMENT_QUEUE } from './queue.constants';
import { Announcement, AnnouncementDocument } from '../../schemas/announcement.schema';
import { AnnouncementRecipient, AnnouncementRecipientDocument } from '../../schemas/announcement-recipient.schema';
import { NewsletterSubscriber, NewsletterSubscriberDocument } from '../../schemas/newsletter-subscriber.schema';
import { MailService } from '../mail/mail.service';

export interface AnnouncementJobData {
  announcementId: string;
}

@Processor(ANNOUNCEMENT_QUEUE)
export class AnnouncementProcessor extends WorkerHost {
  private readonly logger = new Logger(AnnouncementProcessor.name);

  // Batch size - send emails in groups to avoid overwhelming the SMTP server
  private readonly BATCH_SIZE = 20;

  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,

    @InjectModel(AnnouncementRecipient.name)
    private readonly recipientModel: Model<AnnouncementRecipientDocument>,

    @InjectModel(NewsletterSubscriber.name)
    private readonly subscriberModel: Model<NewsletterSubscriberDocument>,

    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<AnnouncementJobData>): Promise<void> {
    const { announcementId } = job.data;
    this.logger.log(`Processing announcement job ${job.id} → announcementId=${announcementId}`);

    const announcement = await this.announcementModel.findById(announcementId).exec();
    if (!announcement) {
      this.logger.error(`Announcement ${announcementId} not found`);
      return;
    }

    // Mark as PROCESSING
    await this.announcementModel.findByIdAndUpdate(announcementId, {
      $set: { status: 'PROCESSING' },
    }).exec();

    try {
      // ── 1. Collect recipients ────────────────────────────────────────────────
      const recipients = await this.collectRecipients(announcement);
      this.logger.log(`Announcement ${announcementId}: ${recipients.length} recipients`);

      // Update recipient count
      await this.announcementModel.findByIdAndUpdate(announcementId, {
        $set: { recipientCount: recipients.length },
      }).exec();

      // ── 2. Persist recipient records (snapshot at send time) ─────────────────
      if (recipients.length > 0) {
        const recipientDocs = recipients.map((r) => ({
          announcementId: new Types.ObjectId(announcementId),
          email: r.email,
          firstName: r.firstName,
          status: 'PENDING',
        }));

        // insertMany with ordered:false to skip duplicates gracefully
        await this.recipientModel
          .insertMany(recipientDocs, { ordered: false })
          .catch(() => {
            // Ignore duplicate key errors (idempotent re-send)
          });
      }

      // ── 3. Send in batches ───────────────────────────────────────────────────
      let sent = 0;
      let failed = 0;
      const publicUrl = process.env.PUBLIC_URL ?? 'http://localhost:3000';

      for (let i = 0; i < recipients.length; i += this.BATCH_SIZE) {
        const batch = recipients.slice(i, i + this.BATCH_SIZE);

        await Promise.allSettled(
          batch.map(async (recipient) => {
            const unsubscribeToken = await this.getOrCreateUnsubscribeToken(recipient.email);
            const unsubscribeUrl = `${publicUrl}/api/v1/public/newsletter/unsubscribe?token=${unsubscribeToken}`;

            try {
              await this.mailService.sendAnnouncement({
                to: recipient.email,
                firstName: recipient.firstName,
                subject: announcement.subject,
                contentHtml: announcement.contentHtml,
                unsubscribeUrl,
              });

              await this.recipientModel.updateOne(
                { announcementId: new Types.ObjectId(announcementId), email: recipient.email },
                { $set: { status: 'SENT' } },
              ).exec();

              sent++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              this.logger.warn(`Failed to send to ${recipient.email}: ${errorMsg}`);

              await this.recipientModel.updateOne(
                { announcementId: new Types.ObjectId(announcementId), email: recipient.email },
                { $set: { status: 'FAILED', error: errorMsg } },
              ).exec();

              failed++;
            }
          }),
        );

        // Update running metrics after each batch
        await this.announcementModel.findByIdAndUpdate(announcementId, {
          $set: { 'metrics.sent': sent, 'metrics.failed': failed },
        }).exec();

        // Update job progress
        await job.updateProgress(Math.round(((i + batch.length) / recipients.length) * 100));
      }

      // ── 4. Final status ──────────────────────────────────────────────────────
      const finalStatus = failed === recipients.length && recipients.length > 0 ? 'FAILED' : 'SENT';

      await this.announcementModel.findByIdAndUpdate(announcementId, {
        $set: {
          status: finalStatus,
          'metrics.sent': sent,
          'metrics.failed': failed,
        },
      }).exec();

      this.logger.log(
        `Announcement ${announcementId} done - status=${finalStatus}, sent=${sent}, failed=${failed}`,
      );
    } catch (error) {
      this.logger.error(`Announcement ${announcementId} processing failed`, error);

      await this.announcementModel.findByIdAndUpdate(announcementId, {
        $set: { status: 'FAILED' },
      }).exec();

      throw error; // Re-throw so BullMQ can retry according to job options
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async collectRecipients(
    announcement: AnnouncementDocument,
  ): Promise<{ email: string; firstName?: string }[]> {
    const recipients: { email: string; firstName?: string }[] = [];
    const groups = announcement.audience?.groups ?? [];

    if (groups.includes('NEWSLETTER') || groups.includes('ALL')) {
      const subscribers = await this.subscriberModel
        .find({ status: 'SUBSCRIBED' })
        .select('email firstName')
        .exec();

      for (const sub of subscribers) {
        if (!recipients.find((r) => r.email === sub.email)) {
          recipients.push({ email: sub.email, firstName: sub.firstName });
        }
      }
    }

    return recipients;
  }

  private async getOrCreateUnsubscribeToken(email: string): Promise<string> {
    const sub = await this.subscriberModel.findOne({ email }).exec();
    if (!sub) return '';

    if (sub.unsubscribeToken) return sub.unsubscribeToken;

    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');

    await this.subscriberModel.findByIdAndUpdate(sub._id, {
      $set: { unsubscribeToken: token },
    }).exec();

    return token;
  }
}
