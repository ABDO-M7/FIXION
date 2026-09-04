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
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
@Index(['userId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Column({ length: 50 })
  type: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  @Column({ default: false })
  isRead: boolean;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
