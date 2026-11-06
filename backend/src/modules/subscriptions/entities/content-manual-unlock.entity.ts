import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('content_manual_unlocks')
@Unique(['studentId', 'courseName', 'groupName', 'itemType', 'itemId'])
export class ContentManualUnlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'student_id' })
  studentId: string;

  @Index()
  @Column({ name: 'course_name' })
  courseName: string;

  @Index()
  @Column({ name: 'group_name' })
  groupName: string;

  @Column({ name: 'item_type', type: 'varchar', length: 20 })
  itemType: 'VIDEO' | 'ASSIGNMENT';

  @Index()
  @Column({ name: 'item_id' })
  itemId: string;

  @Column({ name: 'unlocked_by', nullable: true })
  unlockedByTeacherId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
