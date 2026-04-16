import { QuestionStatus } from '../entities/question.entity';
export declare class CreateQuestionDto {
    content: string;
    attachments?: string[];
}
export declare class UpdateQuestionStatusDto {
    status: QuestionStatus;
}
export declare class AssignCategoryDto {
    categoryId: string;
}
export declare class SearchQuestionsDto {
    search?: string;
    status?: QuestionStatus;
    subject?: string;
    page?: string;
    limit?: string;
}
