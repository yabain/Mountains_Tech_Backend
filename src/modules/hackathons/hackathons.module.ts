import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HackathonsService } from './hackathons.service';
import { HackathonsPublicController, HackathonsAdminController } from './hackathons.controller';
import { Hackathon, HackathonSchema } from '../../schemas/hackathon.schema';
import { HackathonTeam, HackathonTeamSchema } from '../../schemas/hackathon-team.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hackathon.name, schema: HackathonSchema },
      { name: HackathonTeam.name, schema: HackathonTeamSchema },
    ]),
  ],
  controllers: [HackathonsPublicController, HackathonsAdminController],
  providers: [HackathonsService],
  exports: [HackathonsService],
})
export class HackathonsModule {}
