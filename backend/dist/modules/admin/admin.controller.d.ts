import { UsersService } from '../users/users.service';
import { QuestionsService } from '../questions/questions.service';
import { AnswersService } from '../answers/answers.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
export declare class AdminController {
    private usersService;
    private questionsService;
    private answersService;
    private subscriptionsService;
    constructor(usersService: UsersService, questionsService: QuestionsService, answersService: AnswersService, subscriptionsService: SubscriptionsService);
    overview(): Promise<{
        users: {
            total: number;
            students: number;
            teachers: number;
        };
        questions: {
            total: number;
            pending: number;
            answered: number;
        };
        answers: {
            total: number;
        };
        subscriptions: {
            totalCodes: number;
            usedCodes: number;
            availableCodes: number;
            activeSubscriptions: number;
        };
        generatedAt: string;
    }>;
}
