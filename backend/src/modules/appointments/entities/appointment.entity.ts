import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AppointmentStatus {
  PENDING   = 'PENDING',
  ACCEPTED  = 'ACCEPTED',
  DECLINED  = 'DECLINED',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Index()
  @Column()
  studentId: string;

  // Teacher who replied (nullable until a teacher acts on it)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Index()
  @Column({ nullable: true })
  teacherId: string;

  // Subject/course name — used to match teacher specialization
  @Column()
  courseName: string;

  // What topic the student needs explained
  @Column({ type: 'text' })
  topic: string;

  // Optional extra message from student
  @Column({ type: 'text', nullable: true })
  message: string;

  // Student's preferred time (free text or ISO string)
  @Column({ nullable: true })
  preferredTime: string;

  @Index()
  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  // Teacher's reply message
  @Column({ type: 'text', nullable: true })
  teacherReply: string;

  // Teacher-confirmed time
  @Column({ nullable: true })
  scheduledTime: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
