import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
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
  }

  async saveRefreshTokenHash(id: string, hash: string): Promise<void> {
    await this.usersRepo.update(id, { refreshTokenHash: hash });
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
  }

  async updateOAuth(id: string, provider: string, oauthId: string): Promise<User> {
    await this.usersRepo.update(id, { oauthProvider: provider, oauthId });
    return this.findById(id) as Promise<User>;
  }

  async findAll(page = 1, limit = 20, role?: UserRole) {
    const qb = this.usersRepo.createQueryBuilder('user');
    if (role) qb.where('user.role = :role', { role });
    qb.skip((page - 1) * limit).take(limit).orderBy('user.createdAt', 'DESC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepo.update(id, data as any);
    return this.findById(id) as Promise<User>;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.remove(user);
  }

  async getStats() {
    const total = await this.usersRepo.count();
    const students = await this.usersRepo.count({ where: { role: UserRole.STUDENT } });
    const teachers = await this.usersRepo.count({ where: { role: UserRole.TEACHER } });
    return { total, students, teachers };
  }
}
