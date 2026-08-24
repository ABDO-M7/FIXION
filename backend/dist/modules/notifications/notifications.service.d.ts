import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { EmailService } from './email.service';
import { User } from '../users/entities/user.entity';
export declare class NotificationsService {
    private notificationsRepo;
    private usersRepo;
    private gateway;
    private emailService;
    constructor(notificationsRepo: Repository<Notification>, usersRepo: Repository<User>, gateway: NotificationsGateway, emailService: EmailService);
    notifyAnswered(studentId: string, questionId: string, questionSnippet: string): Promise<Notification>;
    notifyNewQuestion(questionId: string, studentName: string, courseName?: string): Promise<void>;
    getMyNotifications(userId: string, page?: number, limit?: number): Promise<{
        data: Notification[];
        total: number;
        page: number;
        limit: number;
    }>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
    getUnreadCount(userId: string): Promise<number>;
}
