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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionCode = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const subscription_entity_1 = require("./subscription.entity");
let SubscriptionCode = class SubscriptionCode {
    id;
    code;
    plan;
    isUsed;
    usedBy;
    usedById;
    createdBy;
    createdById;
    usedAt;
    expiresAt;
    createdAt;
};
exports.SubscriptionCode = SubscriptionCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionCode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 32 }),
    __metadata("design:type", String)
], SubscriptionCode.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: subscription_entity_1.SubscriptionPlan }),
    __metadata("design:type", String)
], SubscriptionCode.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SubscriptionCode.prototype, "isUsed", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'used_by' }),
    __metadata("design:type", user_entity_1.User)
], SubscriptionCode.prototype, "usedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SubscriptionCode.prototype, "usedById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], SubscriptionCode.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SubscriptionCode.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], SubscriptionCode.prototype, "usedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], SubscriptionCode.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SubscriptionCode.prototype, "createdAt", void 0);
exports.SubscriptionCode = SubscriptionCode = __decorate([
    (0, typeorm_1.Entity)('subscription_codes')
], SubscriptionCode);
//# sourceMappingURL=subscription-code.entity.js.map