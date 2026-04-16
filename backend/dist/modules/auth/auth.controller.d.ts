import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyEmailDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto, res: any): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/entities/user.entity").UserRole;
            avatarUrl: string;
        };
    }>;
    refresh(req: any, res: any): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/entities/user.entity").UserRole;
            avatarUrl: string;
        };
    }>;
    logout(userId: string, res: any): Promise<{
        message: string;
    }>;
    googleAuth(): void;
    googleCallback(req: any, res: Response): Promise<void>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    getMe(user: any): any;
}
