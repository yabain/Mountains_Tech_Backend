import { Module } from '@nestjs/common';
import { AdminEmailsController } from './admin-emails.controller';

@Module({
  controllers: [AdminEmailsController],
})
export class EmailsModule {}
