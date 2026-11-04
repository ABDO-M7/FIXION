import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AiProviderType = 'groq' | 'gemini' | 'openrouter';

@Entity('ai_api_keys')
export class AiApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'varchar', length: 32, default: 'groq' })
  provider: AiProviderType;

  @Column({ type: 'text' })
  apiKey: string;

  @Column({ type: 'varchar', length: 120, default: 'llama-3.3-70b-versatile' })
  model: string;

  @Column({ type: 'int', default: 14400 })
  dailyRequestLimit: number;

  @Column({ type: 'int', default: 500000 })
  dailyTokenLimit: number;

  @Column({ type: 'int', default: 0 })
  requestsUsedToday: number;

  @Column({ type: 'int', default: 0 })
  tokensUsedToday: number;

  @Column({ type: 'int', default: 0 })
  totalRequests: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @Column({ type: 'int', nullable: true })
  rateLimitRemainingRequests: number | null;

  @Column({ type: 'int', nullable: true })
  rateLimitRemainingTokens: number | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  quotaResetDate: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  cooldownUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
