import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlan } from './entities/subscription.entity';
import { CodeType } from './entities/subscription-code.entity';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('redeem')
  @Roles(UserRole.STUDENT)
  redeem(@Body('code') code: string, @CurrentUser() user: any) {
    return this.subscriptionsService.redeemCode(code, user);
  }

  @Get('status')
  @Roles(UserRole.STUDENT)
  getStatus(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getStatus(userId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  getAll(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.subscriptionsService.getAllSubscriptions(+page, +limit);
  }
}

@Controller('codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodesController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('generate')
  @Roles(UserRole.ADMIN)
  generate(
    @Body('plan') plan: SubscriptionPlan,
    @Body('quantity') quantity: number,
    @Body('codeType') codeType: CodeType,
    @Body('durationDays') durationDays: number,
    @Body('accessScope') accessScope: {
      chapters?: string[];
      lessons?: Array<string | { chapterName: string; lessonName: string }>;
    },
    @Body('codeExpiresAt') codeExpiresAt: string,
    @Body('courseName') courseName: string,
    @Body('teacherId') teacherId: string,
    @Body('groupName') groupName: string,
    @CurrentUser() admin: any,
    @Body('minLength') minLength?: number,
    @Body('maxLength') maxLength?: number,
    @Body('includeLetters') includeLetters?: boolean,
  ) {
    return this.subscriptionsService.generateCodes(
      plan,
      quantity,
      admin,
      codeType || CodeType.TIMED,
      durationDays ? Number(durationDays) : undefined,
      accessScope || undefined,
      codeExpiresAt ? new Date(codeExpiresAt) : undefined,
      courseName || undefined,
      teacherId || undefined,
      groupName || undefined,
      minLength === undefined ? 16 : Number(minLength),
      maxLength === undefined ? 16 : Number(maxLength),
      includeLetters !== false,
    );
  }

  @Get()
  @Roles(UserRole.ADMIN)
  listCodes(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('isUsed') isUsed?: string,
  ) {
    const used = isUsed === undefined ? undefined : isUsed === 'true';
    return this.subscriptionsService.listCodes(+page, +limit, used);
  }

  @Get('teacher-usage')
  @Roles(UserRole.ADMIN)
  teacherUsage(@Query('month') month?: string) {
    return this.subscriptionsService.getTeacherCodeUsage(month);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  revoke(@Param('id') id: string) {
    return this.subscriptionsService.revokeCode(id);
  }
}

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('my')
  @Roles(UserRole.STUDENT)
  getMyEnrollments(@CurrentUser('id') studentId: string) {
    return this.subscriptionsService.getMyEnrollments(studentId);
  }

  @Get('my/:id')
  @Roles(UserRole.STUDENT)
  getEnrollmentById(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser('id') studentId: string) {
    return this.subscriptionsService.getEnrollmentById(id, studentId);
  }
}
