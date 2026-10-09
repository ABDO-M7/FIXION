import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('course_groups')
@Unique(['courseName', 'groupName'])
export class CourseGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 150 })
  courseName: string;

  @Index()
  @Column({ length: 150 })
  groupName: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User | null;

  @Index()
  @Column({ name: 'teacher_id', nullable: true })
  teacherId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  teacherName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  schedule: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
