import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { EmailService } from './email.service';
export declare class NotificationsService {
    private notificationsRepo;
    private gateway;
    private emailService;
    constructor(notificationsRepo: Repository<Notification>, gateway: NotificationsGateway, emailService: EmailService);
    notifyAnswered(studentId: string, questionId: string, questionSnippet: string): Promise<Notification>;
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
