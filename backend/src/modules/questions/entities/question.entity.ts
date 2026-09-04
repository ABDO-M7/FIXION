import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Answer } from '../../answers/entities/answer.entity';

export enum QuestionStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
  CLOSED = 'closed',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Index()
  @Column()
  studentId: string;

  @Column({ type: 'text' })
  content: string;

  @Index()
  @Column({ nullable: true })
  courseName: string;

  @Column({ nullable: true })
  bookName: string;

  @Column({ nullable: true })
  chapter: string;

  @Column({ nullable: true })
  lesson: string;

  @Column({ nullable: true })
  questionNumber: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  attachments: string[];

  @Index()
  @Column({
    type: 'enum',
    enum: QuestionStatus,
    default: QuestionStatus.PENDING,
  })
  status: QuestionStatus;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Index()
  @Column({ nullable: true })
  categoryId: string;

  @OneToMany(() => Answer, (a) => a.question)
  answers: Answer[];

  @Column({ default: false })
  isPublic: boolean;

  // Full-text search vector (auto-updated via DB trigger)
  @Column({
    type: 'tsvector',
    select: false,
    nullable: true,
    generatedType: 'STORED',
    asExpression: `to_tsvector('english', coalesce(content, ''))`,
  })
  searchVector: any;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
