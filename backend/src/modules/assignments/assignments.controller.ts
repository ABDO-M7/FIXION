import {
  Controller, Get, Post, Patch, Delete,
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

  // ── Teacher: get groups for a course ──────────────────────────────────────
  @Get('courses/:courseName/groups')
  @Roles(...STAFF_AND_ADMIN)
  getGroups(@Param('courseName') courseName: string, @CurrentUser() actor: any) {
    return this.assignmentsService.getGroupsForCourse(courseName, actor);
  }

  // ── Teacher: students in a group ──────────────────────────────────────────
  @Get('courses/:courseName/groups/:groupName/students')
  @Roles(...STAFF_AND_ADMIN)
  getStudents(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
  ) {
    return this.assignmentsService.getStudentsInGroup(courseName, groupName);
  }

  // ── Teacher/Student: list assignments for a group ─────────────────────────
  @Get('courses/:courseName/groups/:groupName')
  @Roles(...STAFF_AND_ADMIN)
  getAssignments(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
    @Query('type') type?: AssignmentType,
  ) {
    return this.assignmentsService.getAssignments(courseName, groupName, type);
  }

  // ── Teacher: create assignment ─────────────────────────────────────────────
  @Post()
  @Roles(...STAFF_AND_ADMIN)
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
  ) {
    return this.assignmentsService.getAssignmentWithSubmissions(id, courseName, groupName);
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
    @Body('feedback') feedback?: string,
  ) {
    return this.assignmentsService.gradeSubmission(submissionId, grade, feedback);
  }

  // ── Teacher: grade matrix ─────────────────────────────────────────────────
  @Get('courses/:courseName/groups/:groupName/grades')
  @Roles(...STAFF_AND_ADMIN)
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

  // ══════════════════════════════════════════════════════════════════════════
  //  QUIZ QUESTIONS
  // ══════════════════════════════════════════════════════════════════════════

  // Teacher: list questions for a quiz
  @Get(':id/questions')
  @Roles(...STAFF_AND_ADMIN, UserRole.STUDENT)
  getQuestions(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.assignmentsService.getQuestions(id, actor.role === UserRole.STUDENT ? actor.id : undefined);
  }

  // Teacher: add a question
  @Post(':id/questions')
  @Roles(...STAFF_AND_ADMIN)
  createQuestion(@Param('id') assignmentId: string, @Body() dto: any) {
    return this.assignmentsService.createQuestion(assignmentId, dto);
  }

  // Teacher: update a question
  @Patch(':id/questions/:qid')
  @Roles(...STAFF_AND_ADMIN)
  updateQuestion(@Param('qid') qid: string, @Body() dto: any) {
    return this.assignmentsService.updateQuestion(qid, dto);
  }

  // Teacher: delete a question
  @Delete(':id/questions/:qid')
  @Roles(...STAFF_AND_ADMIN)
  deleteQuestion(@Param('qid') qid: string) {
    return this.assignmentsService.deleteQuestion(qid);
  }

  // Teacher: reorder questions
  @Patch(':id/questions/reorder')
  @Roles(...STAFF_AND_ADMIN)
  reorderQuestions(
    @Param('id') assignmentId: string,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.assignmentsService.reorderQuestions(assignmentId, orderedIds);
  }

  // Teacher: delete assignment
  @Delete(':id')
  @Roles(...STAFF_AND_ADMIN)
  deleteAssignment(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.assignmentsService.deleteAssignment(id, actor);
  }

  // Teacher: publish assignment
  @Patch(':id/publish')
  @Roles(...STAFF_AND_ADMIN)
  publishAssignment(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.assignmentsService.publishAssignment(id, actor);
  }
}
