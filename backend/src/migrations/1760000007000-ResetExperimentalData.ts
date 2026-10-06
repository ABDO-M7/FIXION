import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetExperimentalData1760000007000 implements MigrationInterface {
  name = 'ResetExperimentalData1760000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      TRUNCATE TABLE
        "video_checkpoint_responses",
        "video_checkpoints",
        "course_videos",
        "assignment_submissions",
        "quiz_questions",
        "assignments",
        "appointments",
        "answers",
        "questions",
        "notifications",
        "course_enrollments",
        "subscription_codes",
        "subscriptions",
        "categories"
      RESTART IDENTITY CASCADE
    `);

    await queryRunner.query(`
      DELETE FROM "users"
      WHERE "role" <> 'admin'
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET
        "assignedTeacherId" = NULL,
        "refreshTokenHash" = NULL,
        "emailVerificationToken" = NULL
      WHERE "role" = 'admin'
    `);
  }

  async down(): Promise<void> {
    // Data deletion cannot be reversed without a backup.
  }
}
