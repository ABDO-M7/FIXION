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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const notifications_gateway_1 = require("./notifications.gateway");
const email_service_1 = require("./email.service");
let NotificationsService = class NotificationsService {
    notificationsRepo;
    gateway;
    emailService;
    constructor(notificationsRepo, gateway, emailService) {
        this.notificationsRepo = notificationsRepo;
        this.gateway = gateway;
        this.emailService = emailService;
    }
    async notifyAnswered(studentId, questionId, questionSnippet) {
        const message = `Your question "${questionSnippet}..." has been answered!`;
        const notification = await this.notificationsRepo.save(this.notificationsRepo.create({
            userId: studentId,
            type: 'ANSWER_RECEIVED',
            message,
            metadata: { questionId },
        }));
        this.gateway.sendToUser(studentId, 'notification', {
            id: notification.id,
            type: 'ANSWER_RECEIVED',
            message,
            questionId,
            createdAt: notification.createdAt,
        });
        this.emailService.sendAnswerNotification(studentId, questionId, message).catch(() => { });
        return notification;
    }
    async getMyNotifications(userId, page = 1, limit = 20) {
        const [data, total] = await this.notificationsRepo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
    async markRead(id, userId) {
        await this.notificationsRepo.update({ id, userId }, { isRead: true });
    }
    async markAllRead(userId) {
        await this.notificationsRepo.update({ userId, isRead: false }, { isRead: true });
    }
    async getUnreadCount(userId) {
        return this.notificationsRepo.count({ where: { userId, isRead: false } });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        notifications_gateway_1.NotificationsGateway,
        email_service_1.EmailService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map