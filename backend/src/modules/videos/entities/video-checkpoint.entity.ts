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
import { CourseVideo } from './course-video.entity';

export enum VideoCheckpointType {
  MCQ = 'MCQ',
  ESSAY = 'ESSAY',
}

export interface VideoCheckpointOption {
  id: string;
  text: string;
}

@Entity('video_checkpoints')
export class VideoCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CourseVideo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: CourseVideo;

  @Index()
  @Column()
  videoId: string;

  @Column({ type: 'int' })
  timestampSeconds: number;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'varchar', length: 20, default: VideoCheckpointType.MCQ })
  type: VideoCheckpointType;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  options: VideoCheckpointOption[];

  @Column({ type: 'text', nullable: true })
  correctAnswer: string | null;

  @Column({ type: 'text', nullable: true })
  solutionText: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  solutionUrl: string | null;

  @Column({ type: 'boolean', default: false })
  requireSolutionUpload: boolean;

  @Column({ type: 'boolean', default: true })
  showSolutionAfterAnswer: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
