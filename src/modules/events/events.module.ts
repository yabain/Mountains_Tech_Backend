import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { EventsPublicController, EventsAdminController } from './events.controller';
import { EventEntity, EventSchema } from '../../schemas/event.schema';
import { EventRegistration, EventRegistrationSchema } from '../../schemas/event-registration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventEntity.name, schema: EventSchema },
      { name: EventRegistration.name, schema: EventRegistrationSchema },
    ]),
  ],
  controllers: [EventsPublicController, EventsAdminController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
