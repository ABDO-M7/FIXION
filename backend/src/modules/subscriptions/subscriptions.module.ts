import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController, CodesController } from './subscriptions.controller';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionCode } from './entities/subscription-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, SubscriptionCode])],
  controllers: [SubscriptionsController, CodesController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService, TypeOrmModule],
})
export class SubscriptionsModule {}
