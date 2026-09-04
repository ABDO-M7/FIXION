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
import { AssignmentType } from './entities/assignment.entity';
import { QuizQuestionType } from './entities/quiz-question.entity';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ── Teacher: courses for teacher's specialization ──────────────────────────
  @Get('courses/mine')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getTeacherCourses(@CurrentUser() teacher: any) {
    return this.assignmentsService.getTeacherCourses(teacher);
  }

  // ── Teacher: get groups for a course ──────────────────────────────────────
  @Get('courses/:courseName/groups')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getGroups(@Param('courseName') courseName: string) {
    return this.assignmentsService.getGroupsForCourse(courseName);
  }

  // ── Teacher: students in a group ──────────────────────────────────────────
  @Get('courses/:courseName/groups/:groupName/students')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getStudents(
    @Param('courseName') courseName: string,
    @Param('groupName') groupName: string,
  ) {
    return this.assignmentsService.getStudentsInGroup(courseName, groupName);
  }

  // ── Teacher/Student: list assignments for a group ─────────────────────────
  @Get('courses/:courseName/groups/:groupName')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
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

  // ══════════════════════════════════════════════════════════════════════════
  //  QUIZ QUESTIONS
  // ══════════════════════════════════════════════════════════════════════════

  // Teacher: list questions for a quiz
  @Get(':id/questions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT)
  getQuestions(@Param('id') id: string) {
    return this.assignmentsService.getQuestions(id);
  }

  // Teacher: add a question
  @Post(':id/questions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createQuestion(@Param('id') assignmentId: string, @Body() dto: any) {
    return this.assignmentsService.createQuestion(assignmentId, dto);
  }

  // Teacher: update a question
  @Patch(':id/questions/:qid')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  updateQuestion(@Param('qid') qid: string, @Body() dto: any) {
    return this.assignmentsService.updateQuestion(qid, dto);
  }

  // Teacher: delete a question
  @Delete(':id/questions/:qid')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  deleteQuestion(@Param('qid') qid: string) {
    return this.assignmentsService.deleteQuestion(qid);
  }

  // Teacher: reorder questions
  @Patch(':id/questions/reorder')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  reorderQuestions(
    @Param('id') assignmentId: string,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.assignmentsService.reorderQuestions(assignmentId, orderedIds);
  }

  // Teacher: delete assignment
  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  deleteAssignment(@Param('id') id: string, @CurrentUser('id') teacherId: string) {
    return this.assignmentsService.deleteAssignment(id, teacherId);
  }

  // Teacher: publish assignment
  @Patch(':id/publish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  publishAssignment(@Param('id') id: string, @CurrentUser('id') teacherId: string) {
    return this.assignmentsService.publishAssignment(id, teacherId);
  }
}
