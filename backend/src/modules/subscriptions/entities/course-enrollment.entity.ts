import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SubscriptionCode } from './subscription-code.entity';

@Entity('course_enrollments')
export class CourseEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  studentId: string;

  @Column()
  courseName: string;

  @Column({ nullable: true })
  teacherName: string;

  @Column({ nullable: true })
  groupName: string;

  @ManyToOne(() => SubscriptionCode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'code_id' })
  code: SubscriptionCode;

  @Column({ nullable: true })
  codeId: string;

  @CreateDateColumn()
  createdAt: Date;
}
