import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, QuestionStatus } from './entities/question.entity';
import { CreateQuestionDto, SearchQuestionsDto } from './dto/question.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { resolveStaffScope, hasPermission } from '../../common/staff-access';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionsRepo: Repository<Question>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(CourseEnrollment)
    private enrollmentsRepo: Repository<CourseEnrollment>,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateQuestionDto, student: User): Promise<Question> {
    if (!hasPermission(student, 'student_questions')) throw new ForbiddenException('Questions are disabled for this account');
    if (!dto.courseName?.trim()) throw new ForbiddenException('A course is required for questions');
    const enrollment = await this.enrollmentsRepo.findOne({
      where: { studentId: student.id, courseName: dto.courseName },
      relations: ['teacher'],
      order: { createdAt: 'DESC' },
    });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this course');
    if (!enrollment.teacher || !hasPermission(enrollment.teacher, 'student_questions')) {
      throw new ForbiddenException('Questions are disabled for this course');
    }
    const question = this.questionsRepo.create({
      ...dto,
      studentId: student.id,
    });
    const saved = await this.questionsRepo.save(question);
    
    // Notify teachers asynchronously
    this.notificationsService.notifyNewQuestion(saved.id, student.name, saved.courseName).catch(console.error);
    
    return saved;
  }

  async findMyQuestions(studentId: string, page = 1, limit = 10) {
    const [data, total] = await this.questionsRepo.findAndCount({
      where: { studentId },
      relations: ['answers', 'category'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAll(dto: SearchQuestionsDto, user?: any) {
    const page = parseInt(dto.page || '1');
    const limit = parseInt(dto.limit || '20');

    const qb = this.questionsRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.student', 'student')
      .leftJoinAndSelect('q.category', 'category')
      .leftJoinAndSelect('q.answers', 'answers')
      .orderBy('q.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const scope = user ? await resolveStaffScope(this.usersRepo, user) : { type: 'admin' as const };
    if (scope.type === 'subjects') {
      if (!scope.subjects.length) qb.andWhere('1=0');
      else qb.andWhere('q.courseName IN (:...staffSubjects)', { staffSubjects: scope.subjects });
    } else if (scope.type === 'teacher') {
      if (!scope.teacherName) {
        qb.andWhere('1=0');
      } else {
        qb.andWhere(subQb => {
          const sub = subQb
            .subQuery()
            .select('1')
            .from(CourseEnrollment, 'e')
            .where('e.studentId = q.studentId')
            .andWhere('(e.teacherId = :scopeTeacherId OR (e.teacherId IS NULL AND e.teacherName = :scopeTeacherName))')
            .andWhere('(q.courseName IS NULL OR e.courseName = q.courseName)')
            .getQuery();
          return `EXISTS ${sub}`;
        });
        qb.setParameter('scopeTeacherName', scope.teacherName);
        qb.setParameter('scopeTeacherId', scope.teacherId);
      }
    }

    if (dto.status) qb.andWhere('q.status = :status', { status: dto.status });

    if (dto.search) {
      qb.andWhere(
        `to_tsvector('english', q.content) @@ plainto_tsquery('english', :search)`,
        { search: dto.search },
      );
    }

    if (dto.subject) {
      qb.andWhere('category.subject ILIKE :subject', { subject: `%${dto.subject}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Question> {
    const q = await this.questionsRepo.findOne({
      where: { id },
      relations: ['student', 'category', 'answers', 'answers.teacher'],
    });
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }

  async updateStatus(id: string, status: QuestionStatus): Promise<Question> {
    await this.questionsRepo.update(id, { status });
    return this.findOne(id);
  }

  async assignCategory(id: string, categoryId: string): Promise<Question> {
    await this.questionsRepo.update(id, { categoryId });
    return this.findOne(id);
  }

  async remove(id: string, user: User): Promise<void> {
    const q = await this.findOne(id);
    if (user.role === UserRole.STUDENT && q.studentId !== user.id) {
      throw new ForbiddenException('Not allowed');
    }
    await this.questionsRepo.remove(q);
  }

  async getStats() {
    const total = await this.questionsRepo.count();
    const pending = await this.questionsRepo.count({ where: { status: QuestionStatus.PENDING } });
    const answered = await this.questionsRepo.count({ where: { status: QuestionStatus.ANSWERED } });
    return { total, pending, answered };
  }
}
