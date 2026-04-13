import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { AnswersService, CreateAnswerDto } from './answers.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Post('questions/:questionId/answers')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(
    @Param('questionId') questionId: string,
    @Body() dto: CreateAnswerDto,
    @CurrentUser() user: any,
  ) {
    return this.answersService.create(questionId, dto, user);
  }

  @Get('questions/:questionId/answers')
  findByQuestion(@Param('questionId') questionId: string) {
    return this.answersService.findByQuestion(questionId);
  }

  @Patch('answers/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAnswerDto>,
    @CurrentUser() user: any,
  ) {
    return this.answersService.update(id, dto, user);
  }

  @Delete('answers/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.answersService.remove(id, user);
  }
}
