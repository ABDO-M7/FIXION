import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private repo: Repository<Appointment>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  // ─── Student: create a new appointment request ────────────────────────────
  async create(student: User, dto: {
    courseName: string;
    topic: string;
    message?: string;
    preferredTime?: string;
  }) {
    const appt = this.repo.create({
      studentId: student.id,
      courseName: dto.courseName,
      topic: dto.topic,
      message: dto.message ?? null,
      preferredTime: dto.preferredTime ?? null,
      status: AppointmentStatus.PENDING,
    });
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

  // ─── Teacher: list all pending/handled requests for their specialization ──
  async listForTeacher(teacher: User) {
    const subjects: string[] = teacher.subjects || [];
    if (subjects.length === 0) return [];

    const appts = await this.repo.find({
      where: subjects.map((s) => ({ courseName: s })),
      order: { createdAt: 'DESC' },
    });
    return this.enrichAppointments(appts);
  }

  // ─── Teacher: reply to an appointment ─────────────────────────────────────
  async reply(
    appointmentId: string,
    teacher: User,
    dto: { status: AppointmentStatus; teacherReply?: string; scheduledTime?: string },
  ) {
    const appt = await this.repo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    const subjects: string[] = teacher.subjects || [];
    if (!subjects.includes(appt.courseName)) {
      throw new ForbiddenException('This appointment is not in your specialization');
    }

    appt.teacherId     = teacher.id;
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
