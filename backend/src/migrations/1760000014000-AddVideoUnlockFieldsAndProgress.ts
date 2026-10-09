import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoUnlockFieldsAndProgress1760000014000 implements MigrationInterface {
  name = 'AddVideoUnlockFieldsAndProgress1760000014000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockVideoId" uuid`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockPercent" integer`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockVideoId" uuid`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockPercent" integer`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "video_progress" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "video_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "watchedSeconds" integer NOT NULL DEFAULT 0,
        "durationSeconds" integer NOT NULL DEFAULT 0,
        "watchedPercent" integer NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_video_progress_video_student" UNIQUE ("video_id", "student_id"),
        CONSTRAINT "FK_video_progress_video" FOREIGN KEY ("video_id") REFERENCES "course_videos"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_video_progress_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_video_progress_video_id" ON "video_progress" ("video_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_video_progress_student_id" ON "video_progress" ("student_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "video_progress"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockPercent"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockVideoId"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockPercent"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockVideoId"`);
  }
}
