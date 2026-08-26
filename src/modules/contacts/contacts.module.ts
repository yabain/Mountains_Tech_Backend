import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactsService } from './contacts.service';
import { ContactPublicController, ContactAdminController } from './contacts.controller';
import { Contact, ContactSchema } from '../../schemas/contact.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Contact.name, schema: ContactSchema }])],
  controllers: [ContactPublicController, ContactAdminController],
  providers: [ContactsService],
})
export class ContactsModule {}
