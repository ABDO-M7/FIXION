import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomInt } from 'crypto';
import { addDays } from 'date-fns';
import { isUUID } from 'class-validator';
import { Subscription, SubscriptionPlan } from './entities/subscription.entity';
import { SubscriptionCode, CodeType } from './entities/subscription-code.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { studentCourseVersionKey } from '../../common/cache/course-cache-keys';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DIGIT_ALPHABET = '0123456789';

function generateRandomCode(minLength = 16, maxLength = 16, includeLetters = true) {
  const length = randomInt(minLength, maxLength + 1);
  const alphabet = includeLetters ? CODE_ALPHABET : DIGIT_ALPHABET;
  return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join('');
}

/** Default plan duration in days when durationDays is not explicitly set */
const PLAN_DURATION: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.WEEKLY]: 7,
  [SubscriptionPlan.MONTHLY]: 30,
};

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
    private dataSource: DataSource,
    private cache: RedisCacheService,
  ) {}

  // ─── Redeem ───────────────────────────────────────────────────────────────
  async redeemCode(code: string, student: User): Promise<{ enrollment: CourseEnrollment | null }> {
    const rawCode = (code || '').toUpperCase().trim();
    if (!rawCode) throw new BadRequestException('Code is required');

    return this.dataSource.transaction(async manager => {
      const codesRepo = manager.getRepository(SubscriptionCode);
      const enrollmentsRepo = manager.getRepository(CourseEnrollment);
      const usersRepo = manager.getRepository(User);

      // Lock code row for update to prevent concurrent double-redemption
      const subCode = await codesRepo
        .createQueryBuilder('c')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('c.teacher', 'teacher')
        .where('c.code = :code AND c.isUsed = :isUsed', { code: rawCode, isUsed: false })
        .getOne();

      if (!subCode) {
        throw new NotFoundException('Invalid or already used code');
      }

      // Code itself expired (redemption window) — separate from access expiry
      if (subCode.expiresAt && subCode.expiresAt < new Date()) {
        throw new BadRequestException('This code has expired');
      }

      // Course code: require courseName
      if (!subCode.courseName) {
        throw new BadRequestException('This code is not linked to a course');
      }

      // Resolve teacher
      let teacher = subCode.teacher || null;
      let teacherName = subCode.teacherName || subCode.teacher?.name || null;
      let teacherId = subCode.teacherId || subCode.teacher?.id || null;

      if (!teacherName && subCode.courseName) {
        const teachers = await usersRepo.find({ where: { role: UserRole.TEACHER, isActive: true } });
        const matched = teachers.find(t => Array.isArray(t.subjects) && t.subjects.includes(subCode.courseName!));
        if (matched) {
          teacher = matched;
          teacherId = matched.id;
          teacherName = matched.name;
        }
      }

      // Check if student already has a group for this course if new code doesn't specify one
      let targetGroupName = subCode.groupName?.trim() || '';
      if (!targetGroupName) {
        const existingForGroup = await enrollmentsRepo.findOne({
          where: [
            ...(teacherId ? [{ studentId: student.id, courseName: subCode.courseName, teacherId }] : []),
            { studentId: student.id, courseName: subCode.courseName },
          ],
          order: { createdAt: 'DESC' },
        });
        targetGroupName = existingForGroup?.groupName || 'المجموعة الأساسية';
      }

      const now = new Date();
      const codeType = subCode.codeType ?? CodeType.TIMED;

      // Find if student ALREADY has an enrollment for this course & group & teacher
      const existingEnrollment = await enrollmentsRepo.findOne({
        where: [
          ...(teacherId ? [{ studentId: student.id, courseName: subCode.courseName, groupName: targetGroupName, teacherId }] : []),
          { studentId: student.id, courseName: subCode.courseName, groupName: targetGroupName },
        ],
        order: { createdAt: 'DESC' },
      });

      let savedEnrollment: CourseEnrollment;

      if (existingEnrollment) {
        // UPGRADE / EXTEND existing enrollment — prevents unique constraint violation!
        existingEnrollment.codeId = subCode.id;
        if (teacherId && !existingEnrollment.teacherId) {
          existingEnrollment.teacherId = teacherId;
          existingEnrollment.teacher = teacher;
        }
        if (teacherName && !existingEnrollment.teacherName) {
          existingEnrollment.teacherName = teacherName;
        }

        if (codeType === CodeType.TIMED) {
          const durationDays = subCode.durationDays ?? PLAN_DURATION[subCode.plan] ?? 30;
          // Upgrading to full TIMED (monthly) access
          existingEnrollment.codeType = CodeType.TIMED;
          if (existingEnrollment.expiresAt && existingEnrollment.expiresAt > now) {
            // Extend existing active subscription
            existingEnrollment.expiresAt = addDays(existingEnrollment.expiresAt, durationDays);
          } else {
            // Was expired or was chapter/snapshot: full fresh subscription from now
            existingEnrollment.expiresAt = addDays(now, durationDays);
          }
        } else if (codeType === CodeType.CHAPTER) {
          if (existingEnrollment.codeType === CodeType.CHAPTER) {
            // Merge chapters and lessons
            const existingChapters = existingEnrollment.accessScope?.chapters || [];
            const newChapters = subCode.accessScope?.chapters || [];
            const mergedChapters = Array.from(new Set([...existingChapters, ...newChapters]));

            const existingLessons = existingEnrollment.accessScope?.lessons || [];
            const newLessons = subCode.accessScope?.lessons || [];
            const mergedLessons = [...existingLessons];
            for (const l of newLessons) {
              const already = mergedLessons.some(el =>
                typeof el === 'string' && typeof l === 'string' ? el === l :
                typeof el === 'object' && typeof l === 'object' ? el.chapterName === l.chapterName && el.lessonName === l.lessonName :
                false
              );
              if (!already) mergedLessons.push(l);
            }
            existingEnrollment.accessScope = { chapters: mergedChapters, lessons: mergedLessons };

            if (subCode.durationDays) {
              const chDuration = subCode.durationDays;
              if (existingEnrollment.expiresAt && existingEnrollment.expiresAt > now) {
                existingEnrollment.expiresAt = addDays(existingEnrollment.expiresAt, chDuration);
              } else {
                existingEnrollment.expiresAt = addDays(now, chDuration);
              }
            }
          } else if (existingEnrollment.codeType === CodeType.TIMED) {
            const isTimedActive = !existingEnrollment.expiresAt || existingEnrollment.expiresAt > now;
            if (!isTimedActive) {
              // Expired timed code: activates chapter
              existingEnrollment.codeType = CodeType.CHAPTER;
              existingEnrollment.accessScope = subCode.accessScope ?? null;
              existingEnrollment.expiresAt = subCode.durationDays ? addDays(now, subCode.durationDays) : null;
            } else {
              // Still actively on timed (monthly): keep TIMED full access and save chapter
              const existingChapters = existingEnrollment.accessScope?.chapters || [];
              const newChapters = subCode.accessScope?.chapters || [];
              existingEnrollment.accessScope = {
                chapters: Array.from(new Set([...existingChapters, ...newChapters])),
                lessons: subCode.accessScope?.lessons || existingEnrollment.accessScope?.lessons || [],
              };
            }
          }
        } else if (codeType === CodeType.SNAPSHOT) {
          existingEnrollment.codeType = CodeType.SNAPSHOT;
          existingEnrollment.snapshotAt = now;
          existingEnrollment.expiresAt = null;
        }

        savedEnrollment = await enrollmentsRepo.save(existingEnrollment);
      } else {
        // Fresh enrollment
        let enrollmentExpiresAt: Date | null = null;
        let snapshotAt: Date | null = null;
        let accessScope: any = null;

        if (codeType === CodeType.TIMED) {
          const durationDays = subCode.durationDays ?? PLAN_DURATION[subCode.plan] ?? 30;
          enrollmentExpiresAt = addDays(now, durationDays);
        } else if (codeType === CodeType.SNAPSHOT) {
          snapshotAt = now;
        } else if (codeType === CodeType.CHAPTER) {
          accessScope = subCode.accessScope ?? null;
          enrollmentExpiresAt = subCode.durationDays ? addDays(now, subCode.durationDays) : null;
        }

        const newEnrollment = enrollmentsRepo.create({
          studentId: student.id,
          courseName: subCode.courseName,
          teacherName: teacherName || undefined,
          teacherId: teacherId || undefined,
          teacher: teacher || undefined,
          groupName: targetGroupName,
          codeId: subCode.id,
          codeType,
          expiresAt: enrollmentExpiresAt,
          snapshotAt,
          accessScope,
        });
        savedEnrollment = await enrollmentsRepo.save(newEnrollment);
      }

      // Mark code as used
      await codesRepo.update(subCode.id, {
        isUsed: true,
        usedById: student.id,
        usedAt: now,
      });

      // Invalidate student course cache
      await this.cache.bumpVersion(studentCourseVersionKey(subCode.courseName, targetGroupName, student.id));

      return { enrollment: savedEnrollment };
    });
  }

  // ─── Enrollments ─────────────────────────────────────────────────────────
  async getMyEnrollments(studentId: string): Promise<any[]> {
    const enrollments = await this.enrollmentsRepo.find({
      where: { studentId },
      relations: ['teacher'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(enrollments.map(e => this.withEnrollmentMeta(e)));
  }

  async getEnrollmentById(id: string, studentId: string): Promise<any> {
    const enrollment = await this.enrollmentsRepo.findOne({
      where: { id, studentId },
      relations: ['teacher'],
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return this.withEnrollmentMeta(enrollment);
  }

  private async withEnrollmentMeta(enrollment: CourseEnrollment): Promise<any> {
    let teacher = enrollment.teacher || null;
    let teacherName = teacher?.name || enrollment.teacherName || null;

    if (!teacherName && enrollment.courseName) {
      const teachers = await this.usersRepo.find({ where: { role: UserRole.TEACHER, isActive: true } });
      const matched = teachers.find(t => Array.isArray(t.subjects) && t.subjects.includes(enrollment.courseName));
      if (matched) {
        teacher = matched;
        teacherName = matched.name;
      }
    }

    const permissions = teacher?.permissions || {};

    // Compute per-enrollment status
    const now = new Date();
    const codeType = enrollment.codeType ?? CodeType.TIMED;
    let isExpired = false;
    let daysLeft: number | null = null;

    if ((codeType === CodeType.TIMED || codeType === CodeType.CHAPTER) && enrollment.expiresAt) {
      isExpired = enrollment.expiresAt < now;
      if (!isExpired) {
        daysLeft = Math.ceil((enrollment.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      ...enrollment,
      teacher,
      teacherName: teacherName || 'مدرس المادة',
      teacherPermissions: {
        questions: !!teacher && permissions.student_questions !== false,
        appointments: !!teacher && permissions.student_appointments !== false,
      },
      codeType,
      isExpired,
      daysLeft,
      expiresAt: enrollment.expiresAt ?? null,
      snapshotAt: enrollment.snapshotAt ?? null,
      accessScope: enrollment.accessScope ?? null,
    };
  }

  // ─── Status (kept for backward compat) ───────────────────────────────────
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

  // ─── Generate Codes ───────────────────────────────────────────────────────
  async generateCodes(
    plan: SubscriptionPlan,
    quantity: number,
    admin: User,
    codeType: CodeType = CodeType.TIMED,
    durationDays?: number,
    accessScope?: {
      chapters?: string[];
      lessons?: Array<string | { chapterName: string; lessonName: string }>;
    },
    codeExpiresAt?: Date,
    courseName?: string,
    teacherId?: string,
    groupName?: string,
    minLength = 16,
    maxLength = 16,
    includeLetters = true,
  ) {
    const safeQuantity = Number(quantity);
    if (!Number.isInteger(safeQuantity) || safeQuantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }
    if (
      !Number.isInteger(minLength) || !Number.isInteger(maxLength) ||
      minLength < 4 || maxLength > 64 || minLength > maxLength
    ) {
      throw new BadRequestException('Code length must be between 4 and 64');
    }

    if (codeType === CodeType.TIMED && !courseName) {
      throw new BadRequestException('Timed codes must be linked to a course');
    }
    if (codeType === CodeType.SNAPSHOT && !courseName) {
      throw new BadRequestException('Snapshot codes must be linked to a course');
    }
    if (codeType === CodeType.CHAPTER) {
      if (!courseName) throw new BadRequestException('Chapter codes must be linked to a course');
      if (!teacherId || !groupName) throw new BadRequestException('Chapter codes must be linked to a teacher and group');
      if (!accessScope?.chapters?.length && !accessScope?.lessons?.length) {
        throw new BadRequestException('Chapter codes must specify at least one chapter or lesson');
      }
    }
    if (durationDays !== undefined && (!Number.isInteger(Number(durationDays)) || Number(durationDays) < 1 || Number(durationDays) > 3650)) {
      throw new BadRequestException('Access duration must be between 1 and 3650 days');
    }

    let teacher: User | null = null;
    if (teacherId) {
      if (!isUUID(teacherId)) throw new BadRequestException('Invalid teacher id');
      teacher = await this.usersRepo.findOne({ where: { id: teacherId, role: UserRole.TEACHER } });
      if (!teacher) throw new BadRequestException('Teacher not found');
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
      if (!code) throw new BadRequestException('Could not generate enough unique codes');
      generated.add(code);
      codes.push(
        this.codesRepo.create({
          code,
          plan,
          codeType,
          durationDays: codeType === CodeType.TIMED || codeType === CodeType.CHAPTER ? (durationDays ?? null) : null,
          accessScope: codeType === CodeType.CHAPTER ? (accessScope ?? null) : null,
          createdById: admin.id,
          expiresAt: codeExpiresAt,
          courseName,
          teacherId: teacher?.id,
          teacherName: teacher?.name,
          groupName,
        }),
      );
    }
    return this.codesRepo.save(codes);
  }

  // ─── List / Stats ─────────────────────────────────────────────────────────
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
        teacherName: code.teacher?.name ?? code.teacherName ?? null,
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
