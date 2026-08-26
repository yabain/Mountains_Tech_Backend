import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembersService } from './members.service';
import { MembersPublicController, MembersAdminController } from './members.controller';
import { Member, MemberSchema } from '../../schemas/member.schema';
import { MemberApplication, MemberApplicationSchema } from '../../schemas/member-application.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Member.name, schema: MemberSchema },
      { name: MemberApplication.name, schema: MemberApplicationSchema },
    ]),
  ],
  controllers: [MembersPublicController, MembersAdminController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
