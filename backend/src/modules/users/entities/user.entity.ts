import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ nullable: true, select: false })
  @Exclude()
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, length: 30 })
  phone: string;

  @Index()
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Column({ type: 'varchar', length: 50, nullable: true })
  level: string; // e.g., 'Level 1', 'Level 2', 'Level 3'

  @Column({ type: 'varchar', length: 6, unique: true, nullable: true })
  studentId: string;


  @Column({ nullable: true })
  oauthProvider: string;

  @Column({ nullable: true })
  oauthId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  @Exclude()
  emailVerificationToken: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  @Exclude()
  refreshTokenHash: string | null;

  // Teacher specialization: list of course names they can answer
  @Column({ type: 'jsonb', nullable: true, default: [] })
  subjects: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
