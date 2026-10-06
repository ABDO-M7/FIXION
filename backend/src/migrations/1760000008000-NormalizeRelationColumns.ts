import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeRelationColumns1760000008000 implements MigrationInterface {
  name = 'NormalizeRelationColumns1760000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicateColumns: Array<[string, string]> = [
      ['questions', 'studentId'],
      ['questions', 'categoryId'],
      ['answers', 'questionId'],
      ['answers', 'teacherId'],
      ['assignments', 'teacherId'],
      ['assignment_submissions', 'assignmentId'],
      ['assignment_submissions', 'studentId'],
      ['quiz_questions', 'assignmentId'],
      ['appointments', 'studentId'],
      ['appointments', 'teacherId'],
      ['notifications', 'userId'],
      ['video_checkpoints', 'videoId'],
      ['video_checkpoint_responses', 'checkpointId'],
      ['video_checkpoint_responses', 'videoId'],
      ['video_checkpoint_responses', 'studentId'],
      ['course_videos', 'teacherId'],
      ['subscriptions', 'userId'],
      ['subscription_codes', 'usedById'],
      ['subscription_codes', 'createdById'],
      ['course_enrollments', 'studentId'],
      ['course_enrollments', 'codeId'],
    ];

    for (const [table, column] of duplicateColumns) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`);
    }
  }

  async down(): Promise<void> {
    // Recreating duplicate relation columns would reintroduce ambiguous schema.
  }
}
