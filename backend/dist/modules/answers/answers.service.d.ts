import { Repository } from 'typeorm';
import { Answer } from './entities/answer.entity';
import { QuestionsService } from '../questions/questions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
export declare class CreateAnswerDto {
    content: string;
    attachments?: string[];
}
export declare class AnswersService {
    private answersRepo;
    private questionsService;
    private notificationsService;
    constructor(answersRepo: Repository<Answer>, questionsService: QuestionsService, notificationsService: NotificationsService);
    create(questionId: string, dto: CreateAnswerDto, teacher: User): Promise<Answer>;
    findByQuestion(questionId: string): Promise<Answer[]>;
    update(id: string, dto: Partial<CreateAnswerDto>, teacher: User): Promise<Answer>;
    remove(id: string, user: User): Promise<void>;
    getStats(): Promise<{
        total: number;
    }>;
}
