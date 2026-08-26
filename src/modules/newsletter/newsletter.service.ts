import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsletterSubscriber, NewsletterSubscriberDocument } from '../../schemas/newsletter-subscriber.schema';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(NewsletterSubscriber.name)
    private readonly subscriberModel: Model<NewsletterSubscriberDocument>,
  ) {}

  async subscribe(dto: SubscribeDto) {
    if (!dto.consent) throw new BadRequestException('Le consentement est requis');

    const existing = await this.subscriberModel.findOne({ email: dto.email }).exec();

    if (existing) {
      if (existing.status === 'SUBSCRIBED') {
        throw new ConflictException('Cette adresse email est déjà inscrite à la newsletter');
      }
      // Re-subscribe
      await this.subscriberModel.findByIdAndUpdate(existing._id, {
        $set: { status: 'SUBSCRIBED', consent: true, consentAt: new Date(), unsubscribedAt: null },
      }).exec();
      return { status: 'SUBSCRIBED' };
    }

    await this.subscriberModel.create({
      email: dto.email,
      firstName: dto.firstName,
      consent: dto.consent,
      consentAt: new Date(),
      status: 'SUBSCRIBED',
    });

    return { status: 'SUBSCRIBED' };
  }

  async unsubscribe(email: string) {
    const sub = await this.subscriberModel.findOne({ email }).exec();
    if (!sub) throw new NotFoundException('Abonné introuvable');

    await this.subscriberModel.findByIdAndUpdate(sub._id, {
      $set: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    }).exec();
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.subscriberModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.subscriberModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => {
        const obj = d.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
        delete obj['__v'];
        return obj;
      }),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.subscriberModel.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Abonné introuvable');
  }
}
