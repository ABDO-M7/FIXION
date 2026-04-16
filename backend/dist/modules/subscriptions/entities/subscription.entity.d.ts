import { User } from '../../users/entities/user.entity';
export declare enum SubscriptionPlan {
    WEEKLY = "weekly",
    MONTHLY = "monthly"
}
export declare class Subscription {
    id: string;
    user: User;
    userId: string;
    plan: SubscriptionPlan;
    startsAt: Date;
    expiresAt: Date;
    isActive: boolean;
    codeUsedId: string;
    createdAt: Date;
}
