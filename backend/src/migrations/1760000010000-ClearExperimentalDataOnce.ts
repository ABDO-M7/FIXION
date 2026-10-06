import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClearExperimentalDataOnce1760000010000 implements MigrationInterface {
  name = 'ClearExperimentalDataOnce1760000010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM "video_checkpoint_responses"');
    await queryRunner.query('DELETE FROM "video_checkpoints"');
    await queryRunner.query('DELETE FROM "course_videos"');
    await queryRunner.query('DELETE FROM "assignment_submissions"');
    await queryRunner.query('DELETE FROM "quiz_questions"');
    await queryRunner.query('DELETE FROM "assignments"');
    await queryRunner.query('DELETE FROM "appointments"');
    await queryRunner.query('DELETE FROM "answers"');
    await queryRunner.query('DELETE FROM "questions"');
    await queryRunner.query('DELETE FROM "notifications"');
    await queryRunner.query('DELETE FROM "course_enrollments"');
    await queryRunner.query('DELETE FROM "subscription_codes"');
    await queryRunner.query('DELETE FROM "subscriptions"');
    await queryRunner.query('DELETE FROM "categories"');
    await queryRunner.query(`DELETE FROM "users" WHERE "role" <> 'admin'`);
  }

  async down(): Promise<void> {
    // Deleted experimental data cannot be restored without a backup.
  }
}
