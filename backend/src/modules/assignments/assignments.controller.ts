import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentType } from './entities/assignment.entity';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ── Teacher: get their own course list (from specializations) ──────────────
  @Get('courses/mine')
  @Roles(UserRole.TEACHER)
  getTeacherCourses(@CurrentUser() teacher: any) {
    return this.assignmentsService.getTeacherCourses(teacher);
  }

  // ── Teacher: get distinct groups for a course ──────────────────────────────
  @Get('courses/:courseName/groups')
  @Roles(UserRole.TEACHER)
  getGroups(@Param('courseName') courseName: string) {
    return this.assignmentsService.getGroupsForCourse(courseName);
  }

  // ── Teacher: get students in a group ───────────────────────────────────────
  @Get('courses/:courseName/groups/:groupName/students')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getStudents(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
  ) {
    return this.assignmentsService.getStudentsInGroup(courseName, groupName);
  }

  // ── Get assignments for a group (teacher/student) ──────────────────────────
  @Get('courses/:courseName/groups/:groupName')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.ADMIN)
  getAssignments(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
    @Query('type') type?: AssignmentType,
  ) {
    return this.assignmentsService.getAssignments(courseName, groupName, type);
  }

  // ── Teacher: create assignment ─────────────────────────────────────────────
  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createAssignment(@Body() dto: any, @CurrentUser() teacher: any) {
    return this.assignmentsService.createAssignment(dto, teacher);
  }

  // ── Teacher/Student: view assignment + all submissions ─────────────────────
  @Get(':id/submissions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getSubmissions(
    @Param('id') id: string,
    @Query('courseName') courseName: string,
    @Query('groupName') groupName: string,
  ) {
    return this.assignmentsService.getAssignmentWithSubmissions(id, courseName, groupName);
  }

  // ── Student: submit an assignment ──────────────────────────────────────────
  @Post(':id/submissions')
  @Roles(UserRole.STUDENT)
  submitAssignment(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() student: any,
  ) {
    return this.assignmentsService.submitAssignment(id, student, dto);
  }

  // ── Teacher: grade a submission ────────────────────────────────────────────
  @Patch('submissions/:submissionId/grade')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body('grade') grade: number,
    @Body('feedback') feedback?: string,
  ) {
    return this.assignmentsService.gradeSubmission(submissionId, grade, feedback);
  }

  // ── Teacher: grade matrix ─────────────────────────────────────────────────
  @Get('courses/:courseName/groups/:groupName/grades')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getGradeMatrix(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
  ) {
    return this.assignmentsService.getGradeMatrix(courseName, groupName);
  }

  // ── Student: view their own assignments+submissions for a course/group ──────
  @Get('student/courses/:courseName/groups/:groupName')
  @Roles(UserRole.STUDENT)
  getStudentAssignments(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
    @CurrentUser('id') studentId: string,
  ) {
    return this.assignmentsService.getStudentAssignments(studentId, courseName, groupName);
  }

  // ── Teacher: delete assignment ─────────────────────────────────────────────
  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  deleteAssignment(@Param('id') id: string, @CurrentUser('id') teacherId: string) {
    return this.assignmentsService.deleteAssignment(id, teacherId);
  }
}
