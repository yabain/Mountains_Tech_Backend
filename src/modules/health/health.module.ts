import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

// MailService is provided globally via MailModule (@Global)
// MongooseModule connection is available globally via AppModule
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
