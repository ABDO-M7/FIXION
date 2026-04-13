import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  subject: string;

  @Column({ length: 200 })
  bookName: string;

  @Column({ length: 100 })
  chapter: string;

  @Column({ length: 100 })
  lesson: string;

  @Column({ nullable: true })
  questionNumber: number;

  @CreateDateColumn()
  createdAt: Date;
}
