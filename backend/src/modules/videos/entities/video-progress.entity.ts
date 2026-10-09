import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CourseVideo } from './course-video.entity';

@Entity('video_progress')
@Unique(['videoId', 'studentId'])
export class VideoProgress {
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
  watchedSeconds: number;

  @Column({ type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ type: 'int', default: 0 })
  watchedPercent: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
