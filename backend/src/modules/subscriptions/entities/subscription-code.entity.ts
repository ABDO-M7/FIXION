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
import { SubscriptionPlan } from './subscription.entity';

/**
 * Code type controls how access works when a student redeems the code.
 *
 * TIMED    – content is accessible for `durationDays` days from redemption.
 *            After expiry the enrollment locks and the student sees nothing.
 *
 * SNAPSHOT – the student gets permanent access to every piece of content that
 *            was published **at the moment of redemption**.  New content added
 *            after that date will not be visible even though the enrollment
 *            never expires.
 *
 * CHAPTER  – the student gets permanent access to only the specific
 *            chapter(s) / lesson(s) listed in `accessScope.chapters` or
 *            `accessScope.lessons`.  The enrollment never expires.
 */
export enum CodeType {
  TIMED    = 'timed',
  SNAPSHOT = 'snapshot',
  CHAPTER  = 'chapter',
}

@Entity('subscription_codes')
export class SubscriptionCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true, length: 32 })
  code: string;

  @Column({ type: 'enum', enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  /** Access behaviour when the code is redeemed */
  @Column({ type: 'enum', enum: CodeType, default: CodeType.TIMED })
  codeType: CodeType;

  /**
   * How many days of access to grant (TIMED only).
   * When null the old plan-based duration (7 / 30 days) is used as fallback.
   */
  @Column({ type: 'integer', nullable: true })
  durationDays: number | null;

  /**
   * Extra scope data (CHAPTER type).
   * Shape: { chapters?: string[]; lessons?: string[] }
   */
  @Column({ type: 'jsonb', nullable: true })
  accessScope: { chapters?: string[]; lessons?: string[] } | null;

  @Index()
  @Column({ default: false })
  isUsed: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'used_by' })
  usedBy: User;

  @Column({ name: 'used_by', nullable: true })
  usedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @Column({ nullable: true, type: 'timestamptz' })
  usedAt: Date;

  /** Date after which the code itself can no longer be redeemed (not the access expiry) */
  @Column({ nullable: true, type: 'timestamptz' })
  expiresAt: Date;

  @Column({ nullable: true })
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
