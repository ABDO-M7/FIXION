import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeRelationColumns1760000008000 implements MigrationInterface {
  name = 'NormalizeRelationColumns1760000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const canonicalColumns: Array<[string, string]> = [
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

    for (const [table, column] of canonicalColumns) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" uuid`);
    }

    const copies: Array<[string, string, string, string]> = [
      ['questions', 'student_id', 'studentId', 'users'],
      ['questions', 'category_id', 'categoryId', 'categories'],
      ['answers', 'question_id', 'questionId', 'questions'],
      ['answers', 'teacher_id', 'teacherId', 'users'],
      ['assignments', 'teacher_id', 'teacherId', 'users'],
      ['assignment_submissions', 'assignment_id', 'assignmentId', 'assignments'],
      ['assignment_submissions', 'student_id', 'studentId', 'users'],
      ['quiz_questions', 'assignment_id', 'assignmentId', 'assignments'],
      ['appointments', 'student_id', 'studentId', 'users'],
      ['appointments', 'teacher_id', 'teacherId', 'users'],
      ['notifications', 'user_id', 'userId', 'users'],
      ['video_checkpoints', 'video_id', 'videoId', 'course_videos'],
      ['video_checkpoint_responses', 'checkpoint_id', 'checkpointId', 'video_checkpoints'],
      ['video_checkpoint_responses', 'video_id', 'videoId', 'course_videos'],
      ['video_checkpoint_responses', 'student_id', 'studentId', 'users'],
      ['course_videos', 'teacher_id', 'teacherId', 'users'],
      ['subscriptions', 'user_id', 'userId', 'users'],
      ['subscription_codes', 'used_by', 'usedById', 'users'],
      ['subscription_codes', 'created_by', 'createdById', 'users'],
      ['course_enrollments', 'student_id', 'studentId', 'users'],
      ['course_enrollments', 'code_id', 'codeId', 'subscription_codes'],
    ];

    for (const [table, canonical, legacy, referencedTable] of copies) {
      await queryRunner.query(`
        UPDATE "${table}"
        SET "${canonical}" = CASE
          WHEN "${legacy}"::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          THEN "${legacy}"::text::uuid
          ELSE NULL
        END
        WHERE "${canonical}" IS NULL
          AND "${legacy}" IS NOT NULL
          AND "${legacy}"::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          AND EXISTS (
            SELECT 1
            FROM "${referencedTable}" referenced
            WHERE referenced."id" = "${table}"."${legacy}"::text::uuid
          )
      `);
    }

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

    await queryRunner.query(`
      ALTER TABLE "video_checkpoint_responses"
      DROP CONSTRAINT IF EXISTS "UQ_video_response_checkpoint_student"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_video_response_checkpoint_student_canonical"
      ON "video_checkpoint_responses" ("checkpoint_id", "student_id")
    `);
  }

  async down(): Promise<void> {
    // Recreating duplicate relation columns would reintroduce ambiguous schema.
  }
}
