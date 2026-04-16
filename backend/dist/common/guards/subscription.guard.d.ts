import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Subscription } from '../../modules/subscriptions/entities/subscription.entity';
export declare class SubscriptionGuard implements CanActivate {
    private subscriptionsRepo;
    constructor(subscriptionsRepo: Repository<Subscription>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
