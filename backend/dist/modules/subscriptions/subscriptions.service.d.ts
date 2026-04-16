import { Repository } from 'typeorm';
import { Subscription, SubscriptionPlan } from './entities/subscription.entity';
import { SubscriptionCode } from './entities/subscription-code.entity';
import { User } from '../users/entities/user.entity';
export declare class SubscriptionsService {
    private subscriptionsRepo;
    private codesRepo;
    constructor(subscriptionsRepo: Repository<Subscription>, codesRepo: Repository<SubscriptionCode>);
    redeemCode(code: string, student: User): Promise<Subscription>;
    getStatus(userId: string): Promise<{
        isActive: boolean;
        plan: null;
        expiresAt: null;
        daysLeft: number;
    } | {
        isActive: boolean;
        plan: SubscriptionPlan;
        expiresAt: Date;
        daysLeft: number;
    }>;
    generateCodes(plan: SubscriptionPlan, quantity: number, admin: User, expiresAt?: Date): Promise<SubscriptionCode[]>;
    listCodes(page?: number, limit?: number, isUsed?: boolean): Promise<{
        data: SubscriptionCode[];
        total: number;
        page: number;
        limit: number;
    }>;
    revokeCode(id: string): Promise<{
        message: string;
    }>;
    getAllSubscriptions(page?: number, limit?: number): Promise<{
        data: Subscription[];
        total: number;
        page: number;
    }>;
    getStats(): Promise<{
        totalCodes: number;
        usedCodes: number;
        availableCodes: number;
        activeSubscriptions: number;
    }>;
}
