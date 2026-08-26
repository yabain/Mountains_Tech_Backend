import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PartnersService } from './partners.service';
import { PartnersAdminController } from './partners.controller';
import { Partner, PartnerSchema } from '../../schemas/partner.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Partner.name, schema: PartnerSchema }])],
  controllers: [PartnersAdminController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
