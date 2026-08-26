import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AssignmentSubmission } from './assignment-submission.entity';

export enum AssignmentType {
  QUIZ = 'QUIZ',
  HOMEWORK = 'HOMEWORK',
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  courseName: string;

  @Column()
  groupName: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column()
  teacherId: string;

  @Column({ type: 'enum', enum: AssignmentType })
  type: AssignmentType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  attachments: string[];

  @Column({ type: 'timestamptz', nullable: true })
  dueDate: Date;

  @OneToMany(() => AssignmentSubmission, (s) => s.assignment)
  submissions: AssignmentSubmission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
