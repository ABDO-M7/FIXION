import { User } from '../../users/entities/user.entity';
import { Question } from '../../questions/entities/question.entity';
export declare class Answer {
    id: string;
    question: Question;
    questionId: string;
    teacher: User;
    teacherId: string;
    content: string;
    attachments: string[];
    isAccepted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
