import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../modules/subscriptions/entities/subscription.entity';
import { UserRole } from '../../modules/users/entities/user.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    // Teachers and admins bypass subscription check
    if (user.role !== UserRole.STUDENT) return true;

    const subscription = await this.subscriptionsRepo.findOne({
      where: { userId: user.id, isActive: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'An active subscription is required to submit questions.',
      );
    }

    if (subscription.expiresAt < new Date()) {
      // Auto-deactivate expired subscription
      await this.subscriptionsRepo.update(subscription.id, { isActive: false });
      throw new ForbiddenException('Your subscription has expired. Please renew.');
    }

    return true;
  }
}
