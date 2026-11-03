import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  private static readonly USER_CACHE_TTL_MS = 30_000;
  private static readonly USER_CACHE_MAX_ENTRIES = 2_000;
  private readonly userCache = new Map<string, { user: User; expiresAt: number }>();

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  invalidateUserCache(id: string): void {
    this.userCache.delete(id);
  }

  private setCachedUser(user: User): void {
    const now = Date.now();
    if (this.userCache.size >= UsersService.USER_CACHE_MAX_ENTRIES) {
      for (const [key, entry] of this.userCache.entries()) {
        if (entry.expiresAt <= now) this.userCache.delete(key);
      }
      if (this.userCache.size >= UsersService.USER_CACHE_MAX_ENTRIES) {
        const oldestKey = this.userCache.keys().next().value;
        if (oldestKey) this.userCache.delete(oldestKey);
      }
    }
    this.userCache.set(user.id, {
      user,
      expiresAt: now + UsersService.USER_CACHE_TTL_MS,
    });
  }

  private async generateStudentId(): Promise<string> {
    while (true) {
      const studentId = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const existing = await this.usersRepo.findOne({ where: { studentId } });
      if (!existing) return studentId;
    }
  }

  async create(data: Partial<User>): Promise<User> {
    let studentId = data.studentId;
    if (!studentId) {
      studentId = await this.generateStudentId();
    }
    const user = this.usersRepo.create({ ...data, studentId });
    const saved = await this.usersRepo.save(user);
    this.setCachedUser(saved);
    return saved;
  }

  async ensureStudentId(id: string): Promise<User> {
    const user = await this.findById(id);
    if (user && !user.studentId) {
      const studentId = await this.generateStudentId();
      await this.usersRepo.update(id, { studentId });
      this.invalidateUserCache(id);
      return this.findById(id) as Promise<User>;
    }
    return user as User;
  }

  async findById(id: string): Promise<User | null> {
    if (!id) return null;
    const cached = this.userCache.get(id);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.user;
      }
      this.userCache.delete(id);
    }
    const user = await this.usersRepo.findOne({ where: { id } });
    if (user) {
      this.setCachedUser(user);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByOAuth(provider: string, oauthId: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { oauthProvider: provider, oauthId } });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { emailVerificationToken: token } });
  }

  async markVerified(id: string): Promise<void> {
    await this.usersRepo.update(id, {
      isVerified: true,
      emailVerificationToken: null as any,
    });
    this.invalidateUserCache(id);
  }

  async saveRefreshTokenHash(id: string, hash: string): Promise<void> {
    await this.usersRepo.update(id, { refreshTokenHash: hash });
    this.invalidateUserCache(id);
  }

  async getRefreshTokenHash(id: string): Promise<string | null> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id })
      .getOne();
    return user?.refreshTokenHash ?? null;
  }

  async clearRefreshToken(id: string): Promise<void> {
    await this.usersRepo.update(id, { refreshTokenHash: null as any });
    this.invalidateUserCache(id);
  }

  async updateOAuth(id: string, provider: string, oauthId: string): Promise<User> {
    await this.usersRepo.update(id, { oauthProvider: provider, oauthId });
    this.invalidateUserCache(id);
    return this.findById(id) as Promise<User>;
  }

  async findAll(page = 1, limit = 20, role?: UserRole) {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.assignedTeacher', 'assignedTeacher');
    if (role) qb.where('user.role = :role', { role });
    qb.skip((page - 1) * limit).take(limit).orderBy('user.createdAt', 'DESC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepo.update(id, data as any);
    this.invalidateUserCache(id);
    return this.findById(id) as Promise<User>;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.update(id, { passwordHash, refreshTokenHash: null as any });
    this.invalidateUserCache(id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.remove(user);
    this.invalidateUserCache(id);
  }

  async getStats() {
    const total = await this.usersRepo.count();
    const students = await this.usersRepo.count({ where: { role: UserRole.STUDENT } });
    const teachers = await this.usersRepo.count({ where: { role: UserRole.TEACHER } });
    const teamMembers = await this.usersRepo.count({ where: { role: UserRole.TEAM_MEMBER } });
    const assistants = await this.usersRepo.count({ where: { role: UserRole.ASSISTANT } });
    return { total, students, teachers, teamMembers, assistants };
  }
}
