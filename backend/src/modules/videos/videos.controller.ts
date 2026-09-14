import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { VideosService } from './videos.service';

@Controller('videos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(@Body() dto: any, @CurrentUser() teacher: any) { return this.videosService.create(dto, teacher); }

  @Get('teacher/:courseName/:groupName')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  listForTeacher(@Param('courseName') courseName: string, @Param('groupName') groupName: string, @CurrentUser('id') teacherId: string) {
    return this.videosService.listForTeacher(courseName, groupName, teacherId);
  }

  @Get('student/:courseName/:groupName')
  @Roles(UserRole.STUDENT)
  listForStudent(@Param('courseName') courseName: string, @Param('groupName') groupName: string, @CurrentUser('id') studentId: string) {
    return this.videosService.listForStudent(courseName, groupName, studentId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser('id') teacherId: string) { return this.videosService.remove(id, teacherId); }
}
