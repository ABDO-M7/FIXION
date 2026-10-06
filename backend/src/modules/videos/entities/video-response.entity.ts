import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VideoCheckpoint } from './video-checkpoint.entity';
import { CourseVideo } from './course-video.entity';

@Entity('video_checkpoint_responses')
@Unique(['checkpointId', 'studentId'])
export class VideoResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VideoCheckpoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'checkpoint_id' })
  checkpoint: VideoCheckpoint;

  @Index()
  @Column({ name: 'checkpoint_id' })
  checkpointId: string;

  @ManyToOne(() => CourseVideo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: CourseVideo;

  @Index()
  @Column({ name: 'video_id' })
  videoId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Index()
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'text', nullable: true })
  answerText: string | null;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  attachments: string[];

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn()
  submittedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
