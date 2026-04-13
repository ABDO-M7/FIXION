import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { EmailService } from './email.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
    private gateway: NotificationsGateway,
    private emailService: EmailService,
  ) {}

  async notifyAnswered(studentId: string, questionId: string, questionSnippet: string) {
    const message = `Your question "${questionSnippet}..." has been answered!`;

    // Persist notification
    const notification = await this.notificationsRepo.save(
      this.notificationsRepo.create({
        userId: studentId,
        type: 'ANSWER_RECEIVED',
        message,
        metadata: { questionId },
      }),
    );

    // Real-time push via WebSocket
    this.gateway.sendToUser(studentId, 'notification', {
      id: notification.id,
      type: 'ANSWER_RECEIVED',
      message,
      questionId,
      createdAt: notification.createdAt,
    });

    // Email notification (async, non-blocking)
    this.emailService.sendAnswerNotification(studentId, questionId, message).catch(() => {});

    return notification;
  }

  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.notificationsRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async markRead(id: string, userId: string) {
    await this.notificationsRepo.update({ id, userId }, { isRead: true });
  }

  async markAllRead(userId: string) {
    await this.notificationsRepo.update({ userId, isRead: false }, { isRead: true });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepo.count({ where: { userId, isRead: false } });
  }
}
