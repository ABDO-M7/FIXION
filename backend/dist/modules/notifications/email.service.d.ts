import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
export declare class EmailService {
    private configService;
    private usersRepo;
    private resend;
    private readonly logger;
    private fromEmail;
    private appName;
    constructor(configService: ConfigService, usersRepo: Repository<User>);
    sendVerificationEmail(email: string, name: string, token: string): Promise<void>;
    sendAnswerNotification(studentId: string, questionId: string, message: string): Promise<void>;
}
