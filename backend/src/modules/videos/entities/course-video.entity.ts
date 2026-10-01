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

@Entity('course_videos')
export class CourseVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  courseName: string;

  @Index()
  @Column()
  groupName: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Index()
  @Column()
  teacherId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Store provider + normalized id, never an arbitrary source URL.
  // youtubeVideoId is kept for backwards compatibility with existing rows.
  @Column({ type: 'varchar', length: 30, default: 'youtube' })
  provider: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerVideoId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  youtubeVideoId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
