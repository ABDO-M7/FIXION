import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(user: any): any;
    updateMe(id: string, body: any): Promise<import("./entities/user.entity").User>;
    findAll(page?: string, limit?: string, role?: UserRole): Promise<{
        data: import("./entities/user.entity").User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateStatus(id: string, isActive: boolean): Promise<import("./entities/user.entity").User>;
    updateRole(id: string, role: UserRole): Promise<import("./entities/user.entity").User>;
    remove(id: string): Promise<void>;
}
