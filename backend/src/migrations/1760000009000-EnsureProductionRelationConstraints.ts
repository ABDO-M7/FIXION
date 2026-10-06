import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureProductionRelationConstraints1760000009000 implements MigrationInterface {
  name = 'EnsureProductionRelationConstraints1760000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const indexes: Array<[string, string]> = [
      ['questions', 'student_id'], ['questions', 'category_id'],
      ['answers', 'question_id'], ['answers', 'teacher_id'],
      ['assignments', 'teacher_id'], ['assignment_submissions', 'assignment_id'],
      ['assignment_submissions', 'student_id'], ['quiz_questions', 'assignment_id'],
      ['appointments', 'student_id'], ['appointments', 'teacher_id'],
      ['notifications', 'user_id'], ['video_checkpoints', 'video_id'],
      ['video_checkpoint_responses', 'checkpoint_id'],
      ['video_checkpoint_responses', 'video_id'], ['video_checkpoint_responses', 'student_id'],
      ['course_videos', 'teacher_id'], ['subscriptions', 'user_id'],
      ['subscription_codes', 'used_by'], ['subscription_codes', 'created_by'],
      ['course_enrollments', 'student_id'], ['course_enrollments', 'code_id'],
    ];

    for (const [table, column] of indexes) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_${table}_${column}" ON "${table}" ("${column}")`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_video_response_checkpoint_student_canonical"
      ON "video_checkpoint_responses" ("checkpoint_id", "student_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_video_response_checkpoint_student_canonical"',
    );
  }
}
