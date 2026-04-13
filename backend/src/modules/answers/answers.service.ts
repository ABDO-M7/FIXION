import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from './entities/answer.entity';
import { QuestionsService } from '../questions/questions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserRole } from '../users/entities/user.entity';
import { QuestionStatus } from '../questions/entities/question.entity';

export class CreateAnswerDto {
  content: string;
  attachments?: string[];
}

@Injectable()
export class AnswersService {
  constructor(
    @InjectRepository(Answer)
    private answersRepo: Repository<Answer>,
    private questionsService: QuestionsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(questionId: string, dto: CreateAnswerDto, teacher: User): Promise<Answer> {
    const question = await this.questionsService.findOne(questionId);

    const answer = await this.answersRepo.save(
      this.answersRepo.create({
        ...dto,
        questionId,
        teacherId: teacher.id,
      }),
    );

    // Mark question as answered
    await this.questionsService.updateStatus(questionId, QuestionStatus.ANSWERED);

    // Send notification to student
    await this.notificationsService.notifyAnswered(
      question.studentId,
      question.id,
      question.content.substring(0, 80),
    );

    return answer;
  }

  async findByQuestion(questionId: string): Promise<Answer[]> {
    return this.answersRepo.find({
      where: { questionId },
      relations: ['teacher'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(id: string, dto: Partial<CreateAnswerDto>, teacher: User): Promise<Answer> {
    const answer = await this.answersRepo.findOne({ where: { id } });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.teacherId !== teacher.id && teacher.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to edit this answer');
    }
    Object.assign(answer, dto);
    return this.answersRepo.save(answer);
  }

  async remove(id: string, user: User): Promise<void> {
    const answer = await this.answersRepo.findOne({ where: { id } });
    if (!answer) throw new NotFoundException('Answer not found');
    if (user.role !== UserRole.ADMIN && answer.teacherId !== user.id) {
      throw new ForbiddenException('Not allowed');
    }
    await this.answersRepo.remove(answer);
  }

  async getStats() {
    return { total: await this.answersRepo.count() };
  }
}
