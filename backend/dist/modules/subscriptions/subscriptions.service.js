"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nanoid_1 = require("nanoid");
const date_fns_1 = require("date-fns");
const subscription_entity_1 = require("./entities/subscription.entity");
const subscription_code_entity_1 = require("./entities/subscription-code.entity");
const generateCode = (0, nanoid_1.customAlphabet)('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 16);
let SubscriptionsService = class SubscriptionsService {
    subscriptionsRepo;
    codesRepo;
    constructor(subscriptionsRepo, codesRepo) {
        this.subscriptionsRepo = subscriptionsRepo;
        this.codesRepo = codesRepo;
    }
    async redeemCode(code, student) {
        const subCode = await this.codesRepo.findOne({
            where: { code: code.toUpperCase().trim(), isUsed: false },
        });
        if (!subCode)
            throw new common_1.NotFoundException('Invalid or already used code');
        if (subCode.expiresAt && subCode.expiresAt < new Date()) {
            throw new common_1.BadRequestException('This code has expired');
        }
        const duration = subCode.plan === subscription_entity_1.SubscriptionPlan.WEEKLY ? 7 : 30;
        let existing = await this.subscriptionsRepo.findOne({
            where: { userId: student.id, isActive: true },
        });
        const baseDate = existing && existing.expiresAt > new Date()
            ? existing.expiresAt
            : new Date();
        const expiresAt = (0, date_fns_1.addDays)(baseDate, duration);
        await this.codesRepo.update(subCode.id, {
            isUsed: true,
            usedById: student.id,
            usedAt: new Date(),
        });
        if (existing) {
            await this.subscriptionsRepo.update(existing.id, { expiresAt, plan: subCode.plan });
            return this.subscriptionsRepo.findOne({ where: { id: existing.id } });
        }
        return this.subscriptionsRepo.save(this.subscriptionsRepo.create({
            userId: student.id,
            plan: subCode.plan,
            startsAt: new Date(),
            expiresAt,
            isActive: true,
            codeUsedId: subCode.id,
        }));
    }
    async getStatus(userId) {
        const sub = await this.subscriptionsRepo.findOne({
            where: { userId, isActive: true },
            order: { expiresAt: 'DESC' },
        });
        if (!sub)
            return { isActive: false, plan: null, expiresAt: null, daysLeft: 0 };
        const now = new Date();
        if (sub.expiresAt < now) {
            await this.subscriptionsRepo.update(sub.id, { isActive: false });
            return { isActive: false, plan: null, expiresAt: null, daysLeft: 0 };
        }
        const daysLeft = Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { isActive: true, plan: sub.plan, expiresAt: sub.expiresAt, daysLeft };
    }
    async generateCodes(plan, quantity, admin, expiresAt) {
        const codes = [];
        for (let i = 0; i < Math.min(quantity, 500); i++) {
            const code = generateCode();
            codes.push(this.codesRepo.create({ code, plan, createdById: admin.id, expiresAt }));
        }
        return this.codesRepo.save(codes);
    }
    async listCodes(page = 1, limit = 50, isUsed) {
        const qb = this.codesRepo
            .createQueryBuilder('c')
            .leftJoinAndSelect('c.usedBy', 'usedBy')
            .orderBy('c.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (isUsed !== undefined)
            qb.where('c.isUsed = :isUsed', { isUsed });
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit };
    }
    async revokeCode(id) {
        const code = await this.codesRepo.findOne({ where: { id } });
        if (!code)
            throw new common_1.NotFoundException('Code not found');
        if (code.isUsed)
            throw new common_1.ForbiddenException('Cannot revoke an already used code');
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
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_code_entity_1.SubscriptionCode)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map