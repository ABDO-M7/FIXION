import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [HealthController],
})
export class HealthModule {}
