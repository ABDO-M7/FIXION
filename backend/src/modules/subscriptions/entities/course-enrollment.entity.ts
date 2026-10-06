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
import { SubscriptionCode } from './subscription-code.entity';

@Entity('course_enrollments')
export class CourseEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Index()
  @Column({ name: 'student_id' })
  studentId: string;

  @Index()
  @Column()
  courseName: string;

  @Column({ nullable: true })
  teacherName: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User | null;

  @Index()
  @Column({ name: 'teacher_id', nullable: true })
  teacherId: string | null;

  @Column({ nullable: true })
  groupName: string;

  @ManyToOne(() => SubscriptionCode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'code_id' })
  code: SubscriptionCode;

  @Column({ name: 'code_id', nullable: true })
  codeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
