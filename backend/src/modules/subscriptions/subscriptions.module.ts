import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController, CodesController, EnrollmentsController } from './subscriptions.controller';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionCode } from './entities/subscription-code.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, SubscriptionCode, CourseEnrollment])],
  controllers: [SubscriptionsController, CodesController, EnrollmentsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService, TypeOrmModule],
})
export class SubscriptionsModule {}
