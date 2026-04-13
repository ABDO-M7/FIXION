import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import { Question, QuestionStatus } from './entities/question.entity';
import { CreateQuestionDto, SearchQuestionsDto } from './dto/question.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionsRepo: Repository<Question>,
  ) {}

  async create(dto: CreateQuestionDto, student: User): Promise<Question> {
    const question = this.questionsRepo.create({
      ...dto,
      studentId: student.id,
    });
    return this.questionsRepo.save(question);
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

  async findAll(dto: SearchQuestionsDto) {
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
