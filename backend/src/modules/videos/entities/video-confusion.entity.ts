import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CourseVideo } from './course-video.entity';

@Entity('video_confusion_marks')
export class VideoConfusionMark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'int', default: 0 })
  startSeconds: number;

  @Column({ type: 'int', default: 0 })
  endSeconds: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

