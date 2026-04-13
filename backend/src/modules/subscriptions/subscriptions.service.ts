import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { addDays } from 'date-fns';
import { Subscription, SubscriptionPlan } from './entities/subscription.entity';
import { SubscriptionCode } from './entities/subscription-code.entity';
import { User } from '../users/entities/user.entity';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 16);

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionCode)
    private codesRepo: Repository<SubscriptionCode>,
  ) {}

  async redeemCode(code: string, student: User): Promise<Subscription> {
    const subCode = await this.codesRepo.findOne({
      where: { code: code.toUpperCase().trim(), isUsed: false },
    });

    if (!subCode) throw new NotFoundException('Invalid or already used code');

    if (subCode.expiresAt && subCode.expiresAt < new Date()) {
      throw new BadRequestException('This code has expired');
    }

    const duration = subCode.plan === SubscriptionPlan.WEEKLY ? 7 : 30;

    // Check for existing active subscription (extend it)
    let existing = await this.subscriptionsRepo.findOne({
      where: { userId: student.id, isActive: true },
    });

    const baseDate = existing && existing.expiresAt > new Date()
      ? existing.expiresAt
      : new Date();

    const expiresAt = addDays(baseDate, duration);

    await this.codesRepo.update(subCode.id, {
      isUsed: true,
      usedById: student.id,
      usedAt: new Date(),
    });

    if (existing) {
      await this.subscriptionsRepo.update(existing.id, { expiresAt, plan: subCode.plan });
      return this.subscriptionsRepo.findOne({ where: { id: existing.id } }) as Promise<Subscription>;
    }

    return this.subscriptionsRepo.save(
      this.subscriptionsRepo.create({
        userId: student.id,
        plan: subCode.plan,
        startsAt: new Date(),
        expiresAt,
        isActive: true,
        codeUsedId: subCode.id,
      }),
    );
  }

  async getStatus(userId: string) {
    const sub = await this.subscriptionsRepo.findOne({
      where: { userId, isActive: true },
      order: { expiresAt: 'DESC' },
    });

    if (!sub) return { isActive: false, plan: null, expiresAt: null, daysLeft: 0 };

    const now = new Date();
    if (sub.expiresAt < now) {
      await this.subscriptionsRepo.update(sub.id, { isActive: false });
      return { isActive: false, plan: null, expiresAt: null, daysLeft: 0 };
    }

    const daysLeft = Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { isActive: true, plan: sub.plan, expiresAt: sub.expiresAt, daysLeft };
  }

  async generateCodes(plan: SubscriptionPlan, quantity: number, admin: User, expiresAt?: Date) {
    const codes: SubscriptionCode[] = [];
    for (let i = 0; i < Math.min(quantity, 500); i++) {
      const code = generateCode();
      codes.push(
        this.codesRepo.create({ code, plan, createdById: admin.id, expiresAt }),
      );
    }
    return this.codesRepo.save(codes);
  }

  async listCodes(page = 1, limit = 50, isUsed?: boolean) {
    const qb = this.codesRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.usedBy', 'usedBy')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (isUsed !== undefined) qb.where('c.isUsed = :isUsed', { isUsed });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async revokeCode(id: string) {
    const code = await this.codesRepo.findOne({ where: { id } });
    if (!code) throw new NotFoundException('Code not found');
    if (code.isUsed) throw new ForbiddenException('Cannot revoke an already used code');
    await this.codesRepo.remove(code);
    return { message: 'Code revoked' };
  }

  async getAllSubscriptions(page = 1, limit = 20) {
    const [data, total] = await this.subscriptionsRepo.findAndCount({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page };
  }

  async getStats() {
    const totalCodes = await this.codesRepo.count();
    const usedCodes = await this.codesRepo.count({ where: { isUsed: true } });
    const activeSubscriptions = await this.subscriptionsRepo.count({ where: { isActive: true } });
    return { totalCodes, usedCodes, availableCodes: totalCodes - usedCodes, activeSubscriptions };
  }
}
