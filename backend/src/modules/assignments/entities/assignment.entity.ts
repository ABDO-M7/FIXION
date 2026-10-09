import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AssignmentSubmission } from './assignment-submission.entity';
import { UnlockRuleType } from '../../learning/unlock-rule';

export enum AssignmentType {
  QUIZ = 'QUIZ',
  HOMEWORK = 'HOMEWORK',
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'courseName' })
  courseName: string;

  @Index()
  @Column()
  groupName: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Index()
  @Column({ name: 'teacher_id' })
  teacherId: string;

  @Column({ type: 'enum', enum: AssignmentType })
  type: AssignmentType;

  @Column({ length: 255 })
  title: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  chapterName: string | null;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  lessonName: string | null;

  @Column({ type: 'int', default: 0 })
  contentOrder: number;

  @Column({ type: 'varchar', length: 32, default: UnlockRuleType.NONE })
  unlockRule: UnlockRuleType;

  @Column({ type: 'uuid', nullable: true })
  unlockAssignmentId: string | null;

  @Column({ type: 'int', nullable: true })
  unlockScore: number | null;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  attachments: string[];

  @Column({ type: 'timestamptz', nullable: true })
  dueDate: Date;

  @Column({ type: 'int', default: 100 })
  maxGrade: number;

  @Column({ default: false })
  isPublished: boolean;

  @OneToMany(() => AssignmentSubmission, (s) => s.assignment)
  submissions: AssignmentSubmission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
