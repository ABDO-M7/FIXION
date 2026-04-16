import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Answer } from '../../answers/entities/answer.entity';
export declare enum QuestionStatus {
    PENDING = "pending",
    ANSWERED = "answered",
    CLOSED = "closed"
}
export declare class Question {
    id: string;
    student: User;
    studentId: string;
    content: string;
    attachments: string[];
    status: QuestionStatus;
    category: Category;
    categoryId: string;
    answers: Answer[];
    isPublic: boolean;
    searchVector: any;
    createdAt: Date;
    updatedAt: Date;
}
