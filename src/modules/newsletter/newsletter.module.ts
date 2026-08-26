import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsletterService } from './newsletter.service';
import { NewsletterPublicController, NewsletterAdminController } from './newsletter.controller';
import { NewsletterSubscriber, NewsletterSubscriberSchema } from '../../schemas/newsletter-subscriber.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema }])],
  controllers: [NewsletterPublicController, NewsletterAdminController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
