import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { resolveStaffScope, workOwnerId } from '../../common/staff-access';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private repo: Repository<Appointment>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(CourseEnrollment)
    private enrollmentsRepo: Repository<CourseEnrollment>,
  ) {}

  // ─── Student: create a new appointment request ────────────────────────────
  async create(student: User, dto: {
    courseName: string;
    topic: string;
    message?: string;
    preferredTime?: string;
  }) {
    const appt = new Appointment();
    appt.studentId = student.id;
    appt.courseName = dto.courseName;
    appt.topic = dto.topic;
    appt.message = dto.message ?? null as any;
    appt.preferredTime = dto.preferredTime ?? null as any;
    appt.status = AppointmentStatus.PENDING;
    return this.repo.save(appt);
  }

  // ─── Student: list their own appointments ─────────────────────────────────
  async listForStudent(studentId: string) {
    const appts = await this.repo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
    return this.enrichAppointments(appts);
  }

  // ─── Staff: list requests in their scope ──────────────────────────────────
  async listForTeacher(teacher: User) {
    const scope = await resolveStaffScope(this.usersRepo, teacher);
    if (scope.type === 'subjects') {
      if (scope.subjects.length === 0) return [];
      const appts = await this.repo.find({
        where: scope.subjects.map((s) => ({ courseName: s })),
        order: { createdAt: 'DESC' },
      });
      return this.enrichAppointments(appts);
    }

    if (scope.type === 'teacher') {
      if (!scope.teacherName) return [];
      const appts = await this.repo
        .createQueryBuilder('a')
        .innerJoin(
          CourseEnrollment,
          'e',
          'e.studentId = a.studentId AND e.teacherName = :teacherName AND e.courseName = a.courseName',
          { teacherName: scope.teacherName },
        )
        .orderBy('a.createdAt', 'DESC')
        .getMany();
      return this.enrichAppointments(appts);
    }

    const appts = await this.repo.find({ order: { createdAt: 'DESC' } });
    return this.enrichAppointments(appts);
  }

  // ─── Staff: reply to an appointment ───────────────────────────────────────
  async reply(
    appointmentId: string,
    teacher: User,
    dto: { status: AppointmentStatus; teacherReply?: string; scheduledTime?: string },
  ) {
    const appt = await this.repo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    const scope = await resolveStaffScope(this.usersRepo, teacher);
    if (scope.type === 'subjects') {
      if (!scope.subjects.includes(appt.courseName)) {
        throw new ForbiddenException('This appointment is not in your subject');
      }
    } else if (scope.type === 'teacher') {
      if (!scope.teacherName) throw new ForbiddenException('No teacher assignment found');
      const enrollment = await this.enrollmentsRepo.findOne({
        where: { studentId: appt.studentId, teacherName: scope.teacherName, courseName: appt.courseName },
      });
      if (!enrollment) throw new ForbiddenException('This appointment is not in your groups');
    }

    appt.teacherId     = workOwnerId(scope, teacher);
    appt.status        = dto.status;
    appt.teacherReply  = dto.teacherReply ?? appt.teacherReply;
    appt.scheduledTime = dto.scheduledTime ?? appt.scheduledTime;
    return this.repo.save(appt);
  }

  // ─── Helper: attach student/teacher user objects ──────────────────────────
  private async enrichAppointments(appts: Appointment[]) {
    if (appts.length === 0) return [];

    const studentIds = [...new Set(appts.map((a) => a.studentId).filter(Boolean))];
    const teacherIds = [...new Set(appts.map((a) => a.teacherId).filter(Boolean))];

    const [students, teachers] = await Promise.all([
      studentIds.length > 0 ? this.usersRepo.findByIds(studentIds) : Promise.resolve([]),
      teacherIds.length > 0 ? this.usersRepo.findByIds(teacherIds) : Promise.resolve([]),
    ]);

    const sMap = new Map(students.map((u) => [u.id, u]));
    const tMap = new Map(teachers.map((u) => [u.id, u]));

    return appts.map((a) => {
      const s = sMap.get(a.studentId);
      const t = a.teacherId ? tMap.get(a.teacherId) : null;
      return {
        id:            a.id,
        courseName:    a.courseName,
        topic:         a.topic,
        message:       a.message,
        preferredTime: a.preferredTime,
        status:        a.status,
        teacherReply:  a.teacherReply,
        scheduledTime: a.scheduledTime,
        createdAt:     a.createdAt,
        student: s ? { id: s.id, name: s.name, email: s.email, studentId: s.studentId, phone: s.phone, level: s.level, avatarUrl: s.avatarUrl } : null,
        teacher: t ? { id: t.id, name: t.name, email: t.email } : null,
      };
    });
  }
}
