import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../notifications/email.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = randomBytes(32).toString('hex');

    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      emailVerificationToken,
    });

    await this.emailService.sendVerificationEmail(user.email, user.name, emailVerificationToken);

    return { message: 'Registration successful. Please verify your email.' };
  }

  async login(dto: LoginDto, res: any) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new ForbiddenException('Account has been deactivated');
    if (!user.isVerified) throw new ForbiddenException('Please verify your email first');

    return this.issueTokens(user, res);
  }

  async googleLogin(googleUser: any, res: any) {
    let user = await this.usersService.findByOAuth('google', googleUser.oauthId);

    if (!user) {
      // Check if email already exists (link accounts)
      const existing = await this.usersService.findByEmail(googleUser.email);
      if (existing) {
        user = await this.usersService.updateOAuth(existing.id, 'google', googleUser.oauthId);
      } else {
        user = await this.usersService.create({
          ...googleUser,
          isVerified: true,
        });
      }
    }

    if (!user.isActive) throw new ForbiddenException('Account has been deactivated');
    return this.issueTokens(user, res);
  }

  async refresh(refreshToken: string, res: any) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) throw new UnauthorizedException();

      const storedHash = await this.usersService.getRefreshTokenHash(user.id);
      const valid = await bcrypt.compare(refreshToken, storedHash);
      if (!valid) throw new UnauthorizedException('Invalid refresh token');

      return this.issueTokens(user, res);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, res: any) {
    await this.usersService.clearRefreshToken(userId);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) throw new NotFoundException('Invalid verification token');
    await this.usersService.markVerified(user.id);
    return { message: 'Email verified successfully. You can now log in.' };
  }

  private async issueTokens(user: User, res: any) {
    const payload = { sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: '7d',
    });

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.saveRefreshTokenHash(user.id, refreshHash);

    const cookieOpts = {
      httpOnly: true,
      secure: this.configService.get('app.nodeEnv') === 'production',
      sameSite: 'lax' as const,
    };

    res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
