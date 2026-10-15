import {
  Controller, Get, Post, Patch, Delete, Header,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { STAFF_AND_ADMIN } from '../../common/staff-access';
import { AssignmentType } from './entities/assignment.entity';
import { QuizQuestionType } from './entities/quiz-question.entity';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ── Teacher: courses for teacher's specialization ──────────────────────────
  @Get('courses/mine')
  @Roles(...STAFF_AND_ADMIN)
  getTeacherCourses(@CurrentUser() teacher: any) {
    return this.assignmentsService.getTeacherCourses(teacher);
  }

  // ── Admin: create new course ───────────────────────────────────────────────
  @Post('courses')
  @Roles(UserRole.ADMIN)
  createCourse(@Body() dto: { name: string; color?: string; description?: string }) {
    return this.assignmentsService.createCourse(dto);
  }

  // ── Admin: delete course ───────────────────────────────────────────────────
  @Delete('courses/:courseName')
  @Roles(UserRole.ADMIN)
  deleteCourse(@Param('courseName') courseName: string) {
    return this.assignmentsService.deleteCourse(courseName);
  }

  // ── Admin: update course ───────────────────────────────────────────────────
  @Patch('courses/:courseName')
  @Roles(UserRole.ADMIN)
  updateCourse(
    @Param('courseName') courseName: string,
    @Body() dto: { name?: string; color?: string; description?: string },
  ) {
    return this.assignmentsService.updateCourse(courseName, dto);
  }

  // ── Admin/Staff: create or update group ────────────────────────────────────
  @Post('courses/:courseName/groups')
  @Roles(...STAFF_AND_ADMIN)
  createGroup(
    @Param('courseName') courseName: string,
    @Body() dto: { groupName: string; teacherId?: string; schedule?: string },
  ) {
    return this.assignmentsService.createCourseGroup(courseName, dto);
  }

  // ── Admin: delete group ───────────────────────────────────────────────────
  @Delete('courses/:courseName/groups/:groupName')
  @Roles(UserRole.ADMIN)
  deleteGroup(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
  ) {
    return this.assignmentsService.deleteCourseGroup(courseName, groupName);
  }


  // ── Teacher: get groups for a course ──────────────────────────────────────
  @Get('courses/:courseName/groups')
  @Header('Cache-Control', 'no-store')
  @Roles(...STAFF_AND_ADMIN)
  getGroups(@Param('courseName') courseName: string, @CurrentUser() actor: any) {
    return this.assignmentsService.getGroupsForCourse(courseName, actor);
  }

  // ── Teacher/Admin: get groups with teacher and student count ──────────────
  @Get('courses/:courseName/groups-detailed')
  @Header('Cache-Control', 'no-store')
  @Roles(...STAFF_AND_ADMIN)
  getGroupsDetailed(@Param('courseName') courseName: string, @CurrentUser() actor: any) {
    return this.assignmentsService.getGroupsDetailedForCourse(courseName, actor);
  }

  @Get('admin/courses/:courseName/teachers/:teacherId/groups')
  @Header('Cache-Control', 'no-store')
  @Roles(UserRole.ADMIN)
  getAdminTeacherGroups(
    @Param('courseName') courseName: string,
    @Param('teacherId') teacherId: string,
  ) {
    return this.assignmentsService.getAdminTeacherGroups(courseName, teacherId);
  }

  @Get('admin/courses/:courseName/groups/:groupName/outline')
  @Header('Cache-Control', 'no-store')
  @Roles(UserRole.ADMIN)
  getAdminTeacherCourseOutline(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
    @Query('teacherId') teacherId: string,
  ) {
    return this.assignmentsService.getAdminTeacherCourseOutline(courseName, groupName, teacherId);
  }

  // ── Teacher: students in a group ──────────────────────────────────────────
  @Get('courses/:courseName/groups/:groupName/students')
  @Roles(...STAFF_AND_ADMIN)
  getStudents(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
    @CurrentUser() actor: any,
  ) {
    return this.assignmentsService.getStudentsInGroup(courseName, groupName, actor);
  }

  // ── Teacher/Student: list assignments for a group ─────────────────────────
  @Get('courses/:courseName/groups/:groupName')
  @Header('Cache-Control', 'no-store')
  @Roles(...STAFF_AND_ADMIN)
  getAssignments(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
    @CurrentUser() actor: any,
    @Query('type') type?: AssignmentType,
  ) {
    return this.assignmentsService.getAssignments(courseName, groupName, type, actor);
  }

  // ── Teacher: create assignment ─────────────────────────────────────────────
  @Post()
  @Roles(UserRole.TEACHER, UserRole.ASSISTANT, UserRole.ADMIN)
  createAssignment(@Body() dto: any, @CurrentUser() teacher: any) {
    return this.assignmentsService.createAssignment(dto, teacher);
  }

  // ── Teacher/Student: view assignment + all submissions ─────────────────────
  @Get(':id/submissions')
  @Roles(...STAFF_AND_ADMIN)
  getSubmissions(
    @Param('id') id: string,
    @Query('courseName') courseName: string,
    @Query('groupName') groupName: string,
    @CurrentUser() actor: any,
  ) {
    return this.assignmentsService.getAssignmentWithSubmissions(id, courseName, groupName, actor);
  }

  // ── Student: submit a homework assignment ──────────────────────────────────
  @Post(':id/submissions')
  @Roles(UserRole.STUDENT)
  submitAssignment(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() student: any,
  ) {
    return this.assignmentsService.submitAssignment(id, student, dto);
  }

  // ── Student: get own submission for an assignment ──────────────────────────
  @Get(':id/my-submission')
  @Roles(UserRole.STUDENT)
  getMySubmission(@Param('id') id: string, @CurrentUser('id') studentId: string) {
    return this.assignmentsService.getStudentSubmission(id, studentId);
  }

  // ── Student: submit a quiz (auto-graded) ──────────────────────────────────
  @Post(':id/quiz-submit')
  @Roles(UserRole.STUDENT)
  submitQuiz(
    @Param('id') id: string,
    @Body('answers') answers: Record<string, string>,
    @CurrentUser() student: any,
  ) {
    return this.assignmentsService.submitQuiz(id, student, answers);
  }

  // ── Teacher: grade a submission (manual override) ─────────────────────────
  @Patch('submissions/:submissionId/grade')
  @Roles(...STAFF_AND_ADMIN)
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body('grade') grade: number,
    @CurrentUser() actor: any,
    @Body('feedback') feedback?: string,
  ) {
    return this.assignmentsService.gradeSubmission(submissionId, grade, feedback, actor);
  }

  // ── Teacher: grade matrix ─────────────────────────────────────────────────
  @Get('courses/:courseName/groups/:groupName/grades')
  @Roles(...STAFF_AND_ADMIN)
  getGradeMatrix(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
    @CurrentUser() actor: any,
  ) {
    return this.assignmentsService.getGradeMatrix(courseName, groupName, actor);
  }

  @Get('courses/:courseName/groups/:groupName/analytics')
  @Roles(...STAFF_AND_ADMIN)
  getGroupAnalytics(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
    @CurrentUser() actor: any,
  ) {
    return this.assignmentsService.getGroupAnalytics(courseName, groupName, actor);
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

  // ══════════════════════════════════════════════════════════════════════════
  //  QUIZ QUESTIONS
  // ══════════════════════════════════════════════════════════════════════════

  // Teacher: list questions for a quiz
  @Get(':id/questions')
  @Roles(...STAFF_AND_ADMIN, UserRole.STUDENT)
  getQuestions(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.assignmentsService.getQuestions(
      id,
      actor,
      actor.role === UserRole.STUDENT ? actor.id : undefined,
    );
  }

  // Teacher: add a question
  @Post(':id/questions')
  @Roles(UserRole.TEACHER, UserRole.ASSISTANT, UserRole.ADMIN)
  createQuestion(@Param('id') assignmentId: string, @Body() dto: any, @CurrentUser() actor: any) {
    return this.assignmentsService.createQuestion(assignmentId, dto, actor);
  }

  // Teacher: update a question
  @Patch(':id/questions/:qid')
  @Roles(UserRole.TEACHER, UserRole.ASSISTANT, UserRole.ADMIN)
  updateQuestion(@Param('id') assignmentId: string, @Param('qid') qid: string, @Body() dto: any, @CurrentUser() actor: any) {
    return this.assignmentsService.updateQuestion(assignmentId, qid, dto, actor);
  }

  // Teacher: delete a question
  @Delete(':id/questions/:qid')
  @Roles(UserRole.TEACHER, UserRole.ASSISTANT, UserRole.ADMIN)
  deleteQuestion(@Param('id') assignmentId: string, @Param('qid') qid: string, @CurrentUser() actor: any) {
    return this.assignmentsService.deleteQuestion(assignmentId, qid, actor);
  }

  // Teacher: reorder questions
  @Patch(':id/questions/reorder')
  @Roles(UserRole.TEACHER, UserRole.ASSISTANT, UserRole.ADMIN)
  reorderQuestions(
    @Param('id') assignmentId: string,
    @Body('orderedIds') orderedIds: string[],
    @CurrentUser() actor: any,
  ) {
    return this.assignmentsService.reorderQuestions(assignmentId, orderedIds, actor);
  }

  // Teacher/Admin: update assignment
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() actor: any,
  ) {
    return this.assignmentsService.updateAssignment(id, dto, actor);
  }

  // Teacher: delete assignment
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  deleteAssignment(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.assignmentsService.deleteAssignment(id, actor);
  }

  // Teacher: publish assignment
  @Patch(':id/publish')
  @Roles(UserRole.TEACHER, UserRole.ASSISTANT, UserRole.ADMIN)
  publishAssignment(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.assignmentsService.publishAssignment(id, actor);
  }
}
