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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const resend_1 = require("resend");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
let EmailService = EmailService_1 = class EmailService {
    configService;
    usersRepo;
    resend;
    logger = new common_1.Logger(EmailService_1.name);
    fromEmail;
    appName;
    constructor(configService, usersRepo) {
        this.configService = configService;
        this.usersRepo = usersRepo;
        this.resend = new resend_1.Resend(configService.get('resend.apiKey'));
        this.fromEmail = configService.get('resend.fromEmail') || 'noreply@example.com';
        this.appName = configService.get('app.appName') || 'EduQ&A';
    }
    async sendVerificationEmail(email, name, token) {
        const frontendUrl = this.configService.get('app.frontendUrl');
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
        }
        catch (err) {
            this.logger.error('Failed to send verification email', err);
        }
    }
    async sendAnswerNotification(studentId, questionId, message) {
        try {
            const user = await this.usersRepo.findOne({ where: { id: studentId } });
            if (!user)
                return;
            const frontendUrl = this.configService.get('app.frontendUrl');
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
        }
        catch (err) {
            this.logger.error('Failed to send answer notification email', err);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], EmailService);
//# sourceMappingURL=email.service.js.map