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
import { CodeType } from './subscription-code.entity';

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

  /** The type of code that created this enrollment */
  @Column({ type: 'enum', enum: CodeType, default: CodeType.TIMED })
  codeType: CodeType;

  /**
   * TIMED or time-limited CHAPTER: when access expires.
   * SNAPSHOT and permanent CHAPTER: null.
   */
  @Column({ nullable: true, type: 'timestamptz' })
  expiresAt: Date | null;

  /**
   * SNAPSHOT: the datetime at which the student redeemed the code.
   * Only content published ON OR BEFORE this timestamp is accessible.
   * TIMED / CHAPTER: null.
   */
  @Column({ nullable: true, type: 'timestamptz' })
  snapshotAt: Date | null;

  /**
   * CHAPTER: restricted chapters/lessons.
   * Shape: { chapters?: string[]; lessons?: Array<string | { chapterName: string; lessonName: string }> }
   * TIMED / SNAPSHOT: null (all content is accessible within expiry / snapshot window).
   */
  @Column({ type: 'jsonb', nullable: true })
  accessScope: { chapters?: string[]; lessons?: Array<string | { chapterName: string; lessonName: string }> } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
