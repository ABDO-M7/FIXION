import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findMine(userId: string, page?: string, limit?: string): Promise<{
        data: import("./entities/notification.entity").Notification[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUnreadCount(userId: string): Promise<number>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
}
