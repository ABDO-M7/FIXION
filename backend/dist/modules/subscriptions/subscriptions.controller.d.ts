import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlan } from './entities/subscription.entity';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    redeem(code: string, user: any): Promise<import("./entities/subscription.entity").Subscription>;
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
    getAll(page?: string, limit?: string): Promise<{
        data: import("./entities/subscription.entity").Subscription[];
        total: number;
        page: number;
    }>;
}
export declare class CodesController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    generate(plan: SubscriptionPlan, quantity: number, expiresAt: string, admin: any): Promise<import("./entities/subscription-code.entity").SubscriptionCode[]>;
    listCodes(page?: string, limit?: string, isUsed?: string): Promise<{
        data: import("./entities/subscription-code.entity").SubscriptionCode[];
        total: number;
        page: number;
        limit: number;
    }>;
    revoke(id: string): Promise<{
        message: string;
    }>;
}
