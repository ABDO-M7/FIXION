import { Repository } from 'typeorm';
import { Question, QuestionStatus } from './entities/question.entity';
import { CreateQuestionDto, SearchQuestionsDto } from './dto/question.dto';
import { User } from '../users/entities/user.entity';
export declare class QuestionsService {
    private questionsRepo;
    constructor(questionsRepo: Repository<Question>);
    create(dto: CreateQuestionDto, student: User): Promise<Question>;
    findMyQuestions(studentId: string, page?: number, limit?: number): Promise<{
        data: Question[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findAll(dto: SearchQuestionsDto): Promise<{
        data: Question[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<Question>;
    updateStatus(id: string, status: QuestionStatus): Promise<Question>;
    assignCategory(id: string, categoryId: string): Promise<Question>;
    remove(id: string, user: User): Promise<void>;
    getStats(): Promise<{
        total: number;
        pending: number;
        answered: number;
    }>;
}
