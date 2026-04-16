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
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const subscription_entity_1 = require("../../modules/subscriptions/entities/subscription.entity");
const user_entity_1 = require("../../modules/users/entities/user.entity");
let SubscriptionGuard = class SubscriptionGuard {
    subscriptionsRepo;
    constructor(subscriptionsRepo) {
        this.subscriptionsRepo = subscriptionsRepo;
    }
    async canActivate(context) {
        const { user } = context.switchToHttp().getRequest();
        if (user.role !== user_entity_1.UserRole.STUDENT)
            return true;
        const subscription = await this.subscriptionsRepo.findOne({
            where: { userId: user.id, isActive: true },
        });
        if (!subscription) {
            throw new common_1.ForbiddenException('An active subscription is required to submit questions.');
        }
        if (subscription.expiresAt < new Date()) {
            await this.subscriptionsRepo.update(subscription.id, { isActive: false });
            throw new common_1.ForbiddenException('Your subscription has expired. Please renew.');
        }
        return true;
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map