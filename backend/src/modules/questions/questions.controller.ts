import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionStatusDto, AssignCategoryDto, SearchQuestionsDto } from './dto/question.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @UseGuards(SubscriptionGuard)
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: any) {
    return this.questionsService.create(dto, user);
  }

  @Get('my')
  @Roles(UserRole.STUDENT)
  findMine(
    @CurrentUser('id') studentId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.questionsService.findMyQuestions(studentId, +page, +limit);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findAll(@Query() query: SearchQuestionsDto) {
    return this.questionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateQuestionStatusDto) {
    return this.questionsService.updateStatus(id, dto.status);
  }

  @Patch(':id/category')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  assignCategory(@Param('id') id: string, @Body() dto: AssignCategoryDto) {
    return this.questionsService.assignCategory(id, dto.categoryId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questionsService.remove(id, user);
  }
}
