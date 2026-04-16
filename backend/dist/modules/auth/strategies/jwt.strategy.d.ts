import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
export interface JwtPayload {
    sub: string;
    role: string;
    iat?: number;
    exp?: number;
}
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private usersService;
    constructor(configService: ConfigService, usersService: UsersService);
    validate(payload: JwtPayload): Promise<import("../../users/entities/user.entity").User | null>;
}
export {};
