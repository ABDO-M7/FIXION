import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { STAFF_AND_ADMIN } from '../../common/staff-access';
import { VideosService } from './videos.service';

@Controller('videos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  @Roles(...STAFF_AND_ADMIN)
  create(@Body() dto: any, @CurrentUser() actor: any) { return this.videosService.create(dto, actor); }

  @Get('teacher/:courseName/:groupName')
  @Roles(...STAFF_AND_ADMIN)
  listForTeacher(@Param('courseName') courseName: string, @Param('groupName') groupName: string, @CurrentUser() actor: any) {
    return this.videosService.listForTeacher(courseName, groupName, actor);
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
  @Roles(...STAFF_AND_ADMIN)
  teacherCheckpoints(@Param('id') videoId: string, @CurrentUser() actor: any) {
    return this.videosService.getTeacherCheckpoints(videoId, actor);
  }

  @Post(':id/checkpoints')
  @Roles(...STAFF_AND_ADMIN)
  createCheckpoint(@Param('id') videoId: string, @Body() dto: any, @CurrentUser() actor: any) {
    return this.videosService.createCheckpoint(videoId, dto, actor);
  }

  @Patch(':id/checkpoints/:checkpointId')
  @Roles(...STAFF_AND_ADMIN)
  updateCheckpoint(
    @Param('id') videoId: string,
    @Param('checkpointId') checkpointId: string,
    @Body() dto: any,
    @CurrentUser() actor: any,
  ) {
    return this.videosService.updateCheckpoint(videoId, checkpointId, dto, actor);
  }

  @Delete(':id/checkpoints/:checkpointId')
  @Roles(...STAFF_AND_ADMIN)
  removeCheckpoint(
    @Param('id') videoId: string,
    @Param('checkpointId') checkpointId: string,
    @CurrentUser() actor: any,
  ) {
    return this.videosService.removeCheckpoint(videoId, checkpointId, actor);
  }

  @Delete(':id')
  @Roles(...STAFF_AND_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() actor: any) { return this.videosService.remove(id, actor); }
}
