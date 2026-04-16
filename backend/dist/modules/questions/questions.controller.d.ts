import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionStatusDto, AssignCategoryDto, SearchQuestionsDto } from './dto/question.dto';
export declare class QuestionsController {
    private readonly questionsService;
    constructor(questionsService: QuestionsService);
    create(dto: CreateQuestionDto, user: any): Promise<import("./entities/question.entity").Question>;
    findMine(studentId: string, page?: string, limit?: string): Promise<{
        data: import("./entities/question.entity").Question[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findAll(query: SearchQuestionsDto): Promise<{
        data: import("./entities/question.entity").Question[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<import("./entities/question.entity").Question>;
    updateStatus(id: string, dto: UpdateQuestionStatusDto): Promise<import("./entities/question.entity").Question>;
    assignCategory(id: string, dto: AssignCategoryDto): Promise<import("./entities/question.entity").Question>;
    remove(id: string, user: any): Promise<void>;
}
