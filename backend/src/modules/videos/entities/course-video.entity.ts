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

  // Store only the normalized YouTube id, never an arbitrary embed URL.
  @Column({ length: 20 })
  youtubeVideoId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
