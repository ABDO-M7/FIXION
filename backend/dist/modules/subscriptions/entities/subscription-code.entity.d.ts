import { User } from '../../users/entities/user.entity';
import { SubscriptionPlan } from './subscription.entity';
export declare class SubscriptionCode {
    id: string;
    code: string;
    plan: SubscriptionPlan;
    isUsed: boolean;
    usedBy: User;
    usedById: string;
    createdBy: User;
    createdById: string;
    usedAt: Date;
    expiresAt: Date;
    createdAt: Date;
}
