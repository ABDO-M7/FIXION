import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Assignment } from './assignment.entity';

export enum QuizQuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TEXT = 'TEXT',
}

export interface QuizOption {
  id: string;         // 'A' | 'B' | 'C' | 'D'
  text: string;
  imageUrl?: string;
}

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @Index()
  @Column()
  assignmentId: string;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'text', nullable: true })
  questionImageUrl: string;

  @Column({ type: 'enum', enum: QuizQuestionType, default: QuizQuestionType.MULTIPLE_CHOICE })
  type: QuizQuestionType;

  // For MULTIPLE_CHOICE: array of { id, text, imageUrl? }
  @Column({ type: 'jsonb', nullable: true, default: [] })
  options: QuizOption[];

  // The correct answer: option id ('A','B',...) for MCQ, or text for TEXT type
  @Column({ type: 'text', nullable: true })
  correctAnswer: string;

  @Column({ type: 'int', default: 1 })
  points: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
