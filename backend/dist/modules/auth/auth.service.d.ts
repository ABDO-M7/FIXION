import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { EmailService } from '../notifications/email.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserRole } from '../users/entities/user.entity';
export declare class AuthService {
    private usersService;
    private jwtService;
    private configService;
    private emailService;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, emailService: EmailService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto, res: any): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: UserRole;
            avatarUrl: string;
        };
    }>;
    googleLogin(googleUser: any, res: any): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: UserRole;
            avatarUrl: string;
        };
    }>;
    refresh(refreshToken: string, res: any): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: UserRole;
            avatarUrl: string;
        };
    }>;
    logout(userId: string, res: any): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    private issueTokens;
}
