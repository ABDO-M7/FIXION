import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { QuestionsService } from '../questions/questions.service';
import { AnswersService } from '../answers/answers.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private usersService: UsersService,
    private questionsService: QuestionsService,
    private answersService: AnswersService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  @Get('overview')
  async overview() {
    const [users, questions, answers, subscriptions] = await Promise.all([
      this.usersService.getStats(),
      this.questionsService.getStats(),
      this.answersService.getStats(),
      this.subscriptionsService.getStats(),
    ]);

    return {
      users,
      questions,
      answers,
      subscriptions,
      generatedAt: new Date().toISOString(),
    };
  }
}
