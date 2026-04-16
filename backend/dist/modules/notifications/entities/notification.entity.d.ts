import { User } from '../../users/entities/user.entity';
export declare class Notification {
    id: string;
    user: User;
    userId: string;
    type: string;
    message: string;
    metadata: Record<string, any>;
    isRead: boolean;
    createdAt: Date;
}
