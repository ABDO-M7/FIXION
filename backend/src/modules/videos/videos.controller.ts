import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
  create(@Body() dto: any, @CurrentUser() actor: any) { return this.videosService.create(dto, actor); }

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

  @Get('student/video/:id/experience')
  @Roles(UserRole.STUDENT)
  studentExperience(@Param('id') videoId: string, @CurrentUser() student: any) {
    return this.videosService.getStudentExperience(videoId, student);
  }

  @Post(':id/checkpoints/:checkpointId/answer')
  @Roles(UserRole.STUDENT)
  answerCheckpoint(
    @Param('id') videoId: string,
    @Param('checkpointId') checkpointId: string,
    @Body() dto: any,
    @CurrentUser() student: any,
  ) {
    return this.videosService.answerCheckpoint(videoId, checkpointId, student, dto);
  }

  @Get(':id/checkpoints')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  teacherCheckpoints(@Param('id') videoId: string, @CurrentUser() actor: any) {
    return this.videosService.getTeacherCheckpoints(videoId, actor);
  }

  @Post(':id/checkpoints')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createCheckpoint(@Param('id') videoId: string, @Body() dto: any, @CurrentUser() actor: any) {
    return this.videosService.createCheckpoint(videoId, dto, actor);
  }

  @Patch(':id/checkpoints/:checkpointId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  updateCheckpoint(
    @Param('id') videoId: string,
    @Param('checkpointId') checkpointId: string,
    @Body() dto: any,
    @CurrentUser() actor: any,
  ) {
    return this.videosService.updateCheckpoint(videoId, checkpointId, dto, actor);
  }

  @Delete(':id/checkpoints/:checkpointId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  removeCheckpoint(
    @Param('id') videoId: string,
    @Param('checkpointId') checkpointId: string,
    @CurrentUser() actor: any,
  ) {
    return this.videosService.removeCheckpoint(videoId, checkpointId, actor);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() actor: any) { return this.videosService.remove(id, actor); }
}
