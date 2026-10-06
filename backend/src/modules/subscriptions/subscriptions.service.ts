import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { addDays } from 'date-fns';
import { isUUID } from 'class-validator';
import { Subscription, SubscriptionPlan } from './entities/subscription.entity';
import { SubscriptionCode } from './entities/subscription-code.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { User, UserRole } from '../users/entities/user.entity';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DIGIT_ALPHABET = '0123456789';

function generateRandomCode(minLength = 16, maxLength = 16, includeLetters = true) {
  const length = randomInt(minLength, maxLength + 1);
  const alphabet = includeLetters ? CODE_ALPHABET : DIGIT_ALPHABET;
  return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join('');
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionCode)
    private codesRepo: Repository<SubscriptionCode>,
    @InjectRepository(CourseEnrollment)
    private enrollmentsRepo: Repository<CourseEnrollment>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async redeemCode(code: string, student: User): Promise<{ subscription: Subscription; enrollment: CourseEnrollment | null }> {
    const subCode = await this.codesRepo.findOne({
      where: { code: code.toUpperCase().trim(), isUsed: false },
    });

    if (!subCode) throw new NotFoundException('Invalid or already used code');

    if (subCode.expiresAt && subCode.expiresAt < new Date()) {
      throw new BadRequestException('This code has expired');
    }

    const duration = subCode.plan === SubscriptionPlan.WEEKLY ? 7 : 30;

    // Check for existing active subscription (extend it)
    let existing = await this.subscriptionsRepo.findOne({
      where: { userId: student.id, isActive: true },
    });

    const baseDate = existing && existing.expiresAt > new Date()
      ? existing.expiresAt
      : new Date();

    const expiresAt = addDays(baseDate, duration);

    await this.codesRepo.update(subCode.id, {
      isUsed: true,
      usedById: student.id,
      usedAt: new Date(),
    });

    let subscription: Subscription;
    if (existing) {
      await this.subscriptionsRepo.update(existing.id, { expiresAt, plan: subCode.plan });
      subscription = await this.subscriptionsRepo.findOne({ where: { id: existing.id } }) as Subscription;
    } else {
      subscription = await this.subscriptionsRepo.save(
        this.subscriptionsRepo.create({
          userId: student.id,
          plan: subCode.plan,
          startsAt: new Date(),
          expiresAt,
          isActive: true,
          codeUsedId: subCode.id,
        }),
      );
    }

    // Auto-enroll in course if code has course info
    let enrollment: CourseEnrollment | null = null;
    if (subCode.courseName) {
      enrollment = await this.enrollmentsRepo.save(
        this.enrollmentsRepo.create({
          studentId: student.id,
          courseName: subCode.courseName,
          teacherName: subCode.teacherName,
          teacherId: subCode.teacherId,
          teacher: subCode.teacher,
          groupName: subCode.groupName,
          codeId: subCode.id,
        }),
      );
    }

    return { subscription, enrollment };
  }

  async getMyEnrollments(studentId: string): Promise<CourseEnrollment[]> {
    return this.enrollmentsRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
  }

  async getEnrollmentById(id: string, studentId: string): Promise<CourseEnrollment> {
    const enrollment = await this.enrollmentsRepo.findOne({ where: { id, studentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async getStatus(userId: string) {
    const sub = await this.subscriptionsRepo.findOne({
      where: { userId, isActive: true },
      order: { expiresAt: 'DESC' },
    });

    if (!sub) return { isActive: false, plan: null, expiresAt: null, daysLeft: 0 };

    const now = new Date();
    if (sub.expiresAt < now) {
      await this.subscriptionsRepo.update(sub.id, { isActive: false });
      return { isActive: false, plan: null, expiresAt: null, daysLeft: 0 };
    }

    const daysLeft = Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { isActive: true, plan: sub.plan, expiresAt: sub.expiresAt, daysLeft };
  }

  async generateCodes(
    plan: SubscriptionPlan,
    quantity: number,
    admin: User,
    expiresAt?: Date,
    courseName?: string,
    teacherId?: string,
    groupName?: string,
    minLength = 16,
    maxLength = 16,
    includeLetters = true,
  ) {
    const safeQuantity = Number(quantity);
    if (!Number.isInteger(safeQuantity) || safeQuantity < 1) throw new BadRequestException('Quantity must be at least 1');
    if (!Number.isInteger(minLength) || !Number.isInteger(maxLength) || minLength < 4 || maxLength > 64 || minLength > maxLength) {
      throw new BadRequestException('Code length range must be between 4 and 64, with minimum no greater than maximum');
    }
    let teacher: User | null = null;
    if (teacherId) {
      if (!isUUID(teacherId)) {
        throw new BadRequestException('Selected teacher id is invalid');
      }
      teacher = await this.usersRepo.findOne({ where: { id: teacherId, role: UserRole.TEACHER } });
      if (!teacher) throw new BadRequestException('Selected teacher was not found');
    }
    const codes: SubscriptionCode[] = [];
    const generated = new Set<string>();
    for (let i = 0; i < Math.min(safeQuantity, 500); i++) {
      let code = '';
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = generateRandomCode(minLength, maxLength, includeLetters);
        if (!generated.has(candidate) && !(await this.codesRepo.findOne({ where: { code: candidate } }))) {
          code = candidate;
          break;
        }
      }
      if (!code) throw new BadRequestException('Could not generate enough unique codes for this range');
      generated.add(code);
      codes.push(
        this.codesRepo.create({
          code,
          plan,
          createdById: admin.id,
          expiresAt,
          courseName,
          teacherId: teacher?.id,
          teacherName: teacher?.name,
          groupName,
        }),
      );
    }
    return this.codesRepo.save(codes);
  }

  async listCodes(page = 1, limit = 50, isUsed?: boolean) {
    const qb = this.codesRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.usedBy', 'usedBy')
      .leftJoinAndSelect('c.teacher', 'teacher')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (isUsed !== undefined) qb.where('c.isUsed = :isUsed', { isUsed });

    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map(code => ({
        ...code,
        teacherName: code.teacherId ? code.teacher?.name ?? null : null,
      })),
      total,
      page,
      limit,
    };
  }

  async getTeacherCodeUsage(month?: string) {
    const parsed = month && /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    const start = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
    const end = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 1));
    const rows = await this.codesRepo
      .createQueryBuilder('c')
      .innerJoin(User, 'teacher', 'teacher.id = c.teacher_id AND teacher.role = :teacherRole', { teacherRole: UserRole.TEACHER })
      .select('teacher.name', 'teacherName')
      .addSelect('COUNT(c.id)', 'usedCodes')
      .where('c.isUsed = :isUsed', { isUsed: true })
      .andWhere('c.teacher_id IS NOT NULL')
      .andWhere('c.usedAt >= :start AND c.usedAt < :end', { start, end })
      .groupBy('teacher.name')
      .orderBy('COUNT(c.id)', 'DESC')
      .getRawMany();

    return {
      month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
      totalUsed: rows.reduce((sum, row) => sum + Number(row.usedCodes || 0), 0),
      teachers: rows.map(row => ({ teacherName: row.teacherName, usedCodes: Number(row.usedCodes || 0) })),
    };
  }

  async revokeCode(id: string) {
    const code = await this.codesRepo.findOne({ where: { id } });
    if (!code) throw new NotFoundException('Code not found');
    if (code.isUsed) throw new ForbiddenException('Cannot revoke an already used code');
    await this.codesRepo.remove(code);
    return { message: 'Code revoked' };
  }

  async getAllSubscriptions(page = 1, limit = 20) {
    const [data, total] = await this.subscriptionsRepo.findAndCount({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page };
  }

  async getStats() {
    const totalCodes = await this.codesRepo.count();
    const usedCodes = await this.codesRepo.count({ where: { isUsed: true } });
    const activeSubscriptions = await this.subscriptionsRepo.count({ where: { isActive: true } });
    return { totalCodes, usedCodes, availableCodes: totalCodes - usedCodes, activeSubscriptions };
  }
}
