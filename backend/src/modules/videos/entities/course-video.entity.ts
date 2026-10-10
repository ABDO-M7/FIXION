import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UnlockRuleType } from '../../learning/unlock-rule';

@Entity('course_videos')
export class CourseVideo {
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

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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

  @Column({ type: 'uuid', nullable: true })
  unlockVideoId: string | null;

  @Column({ type: 'int', nullable: true })
  unlockPercent: number | null;

  // Store provider + normalized id, never an arbitrary source URL.
  // youtubeVideoId is kept for backwards compatibility with existing rows.
  @Column({ type: 'varchar', length: 30, default: 'youtube' })
  provider: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerVideoId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  youtubeVideoId: string | null;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  attachments: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
