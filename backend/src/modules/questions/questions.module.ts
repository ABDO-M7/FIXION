import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Question } from './entities/question.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Subscription, User, CourseEnrollment]), NotificationsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
