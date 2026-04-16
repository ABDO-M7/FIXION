import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
export declare class UsersService {
    private usersRepo;
    constructor(usersRepo: Repository<User>);
    create(data: Partial<User>): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByEmailWithPassword(email: string): Promise<User | null>;
    findByOAuth(provider: string, oauthId: string): Promise<User | null>;
    findByVerificationToken(token: string): Promise<User | null>;
    markVerified(id: string): Promise<void>;
    saveRefreshTokenHash(id: string, hash: string): Promise<void>;
    getRefreshTokenHash(id: string): Promise<string | null>;
    clearRefreshToken(id: string): Promise<void>;
    updateOAuth(id: string, provider: string, oauthId: string): Promise<User>;
    findAll(page?: number, limit?: number, role?: UserRole): Promise<{
        data: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    update(id: string, data: Partial<User>): Promise<User>;
    remove(id: string): Promise<void>;
    getStats(): Promise<{
        total: number;
        students: number;
        teachers: number;
    }>;
}
