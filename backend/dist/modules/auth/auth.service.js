"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
const email_service_1 = require("../notifications/email.service");
let AuthService = class AuthService {
    usersService;
    jwtService;
    configService;
    emailService;
    constructor(usersService, jwtService, configService, emailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.emailService = emailService;
    }
    async register(dto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const emailVerificationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const user = await this.usersService.create({
            email: dto.email,
            name: dto.name,
            passwordHash,
            emailVerificationToken,
        });
        await this.emailService.sendVerificationEmail(user.email, user.name, emailVerificationToken);
        return { message: 'Registration successful. Please verify your email.' };
    }
    async login(dto, res) {
        const user = await this.usersService.findByEmailWithPassword(dto.email);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!user.isActive)
            throw new common_1.ForbiddenException('Account has been deactivated');
        if (!user.isVerified)
            throw new common_1.ForbiddenException('Please verify your email first');
        return this.issueTokens(user, res);
    }
    async googleLogin(googleUser, res) {
        let user = await this.usersService.findByOAuth('google', googleUser.oauthId);
        if (!user) {
            const existing = await this.usersService.findByEmail(googleUser.email);
            if (existing) {
                user = await this.usersService.updateOAuth(existing.id, 'google', googleUser.oauthId);
            }
            else {
                user = await this.usersService.create({
                    ...googleUser,
                    isVerified: true,
                });
            }
        }
        if (!user.isActive)
            throw new common_1.ForbiddenException('Account has been deactivated');
        return this.issueTokens(user, res);
    }
    async refresh(refreshToken, res) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('jwt.refreshSecret'),
            });
            const user = await this.usersService.findById(payload.sub);
            if (!user || !user.isActive)
                throw new common_1.UnauthorizedException();
            const storedHash = await this.usersService.getRefreshTokenHash(user.id);
            const valid = await bcrypt.compare(refreshToken, storedHash);
            if (!valid)
                throw new common_1.UnauthorizedException('Invalid refresh token');
            return this.issueTokens(user, res);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async logout(userId, res) {
        await this.usersService.clearRefreshToken(userId);
        const isProd = this.configService.get('app.nodeEnv') === 'production';
        const cookieOpts = {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
        };
        res.clearCookie('accessToken', cookieOpts);
        res.clearCookie('refreshToken', cookieOpts);
        return { message: 'Logged out successfully' };
    }
    async verifyEmail(token) {
        const user = await this.usersService.findByVerificationToken(token);
        if (!user)
            throw new common_1.NotFoundException('Invalid verification token');
        await this.usersService.markVerified(user.id);
        return { message: 'Email verified successfully. You can now log in.' };
    }
    async issueTokens(user, res) {
        const payload = { sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.secret'),
            expiresIn: '15m',
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.refreshSecret'),
            expiresIn: '7d',
        });
        const refreshHash = await bcrypt.hash(refreshToken, 10);
        await this.usersService.saveRefreshTokenHash(user.id, refreshHash);
        const isProd = this.configService.get('app.nodeEnv') === 'production';
        const cookieOpts = {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
        };
        res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
        return {
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map