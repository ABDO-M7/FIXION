import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private fromEmail: string;
  private appName: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {
    this.resend = new Resend(configService.get<string>('resend.apiKey'));
    this.fromEmail = configService.get<string>('resend.fromEmail') || 'noreply@example.com';
    this.appName = configService.get<string>('app.appName') || 'EduQ&A';
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const verifyUrl = `${frontendUrl}/auth/verify?token=${token}`;

    try {
      await this.resend.emails.send({
        from: `${this.appName} <${this.fromEmail}>`,
        to: email,
        subject: `Verify your ${this.appName} account`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:40px;background:#0f172a;color:#e2e8f0;border-radius:16px">
            <h1 style="color:#818cf8;margin-bottom:8px">${this.appName}</h1>
            <h2 style="color:#f8fafc">Hi ${name}, verify your email</h2>
            <p style="color:#94a3b8">Click the button below to verify your email address and activate your account.</p>
            <a href="${verifyUrl}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
              Verify Email
            </a>
            <p style="color:#64748b;font-size:12px">This link expires in 24 hours. If you didn't register, ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send verification email', err);
    }
  }

  async sendAnswerNotification(studentId: string, questionId: string, message: string) {
    try {
      const user = await this.usersRepo.findOne({ where: { id: studentId } });
      if (!user) return;

      const frontendUrl = this.configService.get<string>('app.frontendUrl');
      const questionUrl = `${frontendUrl}/student/questions/${questionId}`;

      await this.resend.emails.send({
        from: `${this.appName} <${this.fromEmail}>`,
        to: user.email,
        subject: `Your question has been answered — ${this.appName}`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:40px;background:#0f172a;color:#e2e8f0;border-radius:16px">
            <h1 style="color:#818cf8">${this.appName}</h1>
            <h2 style="color:#f8fafc">Hi ${user.name}! 🎉</h2>
            <p style="color:#94a3b8">${message}</p>
            <a href="${questionUrl}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
              View Answer
            </a>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send answer notification email', err);
    }
  }
}
