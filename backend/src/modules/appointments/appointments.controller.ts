import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AppointmentStatus } from './entities/appointment.entity';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  // ── Student: create appointment request ──────────────────────────────────
  @Post()
  @Roles(UserRole.STUDENT)
  create(
    @CurrentUser() student: any,
    @Body() dto: { courseName: string; topic: string; message?: string; preferredTime?: string },
  ) {
    return this.service.create(student, dto);
  }

  // ── Student: list my own appointments ───────────────────────────────────
  @Get('mine')
  @Roles(UserRole.STUDENT)
  listMine(@CurrentUser('id') studentId: string) {
    return this.service.listForStudent(studentId);
  }

  // ── Teacher: list all appointments matching their subjects ───────────────
  @Get('teacher')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  listForTeacher(@CurrentUser() teacher: any) {
    return this.service.listForTeacher(teacher);
  }

  // ── Teacher: reply to an appointment ────────────────────────────────────
  @Patch(':id/reply')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  reply(
    @Param('id') id: string,
    @CurrentUser() teacher: any,
    @Body() dto: { status: AppointmentStatus; teacherReply?: string; scheduledTime?: string },
  ) {
    return this.service.reply(id, teacher, dto);
  }
}
