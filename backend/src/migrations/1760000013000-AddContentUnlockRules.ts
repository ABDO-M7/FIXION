import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentUnlockRules1760000013000 implements MigrationInterface {
  name = 'AddContentUnlockRules1760000013000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockRule" varchar(32) NOT NULL DEFAULT 'NONE'`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockAssignmentId" uuid`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockScore" integer`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockVideoId" uuid`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockPercent" integer`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockRule" varchar(32) NOT NULL DEFAULT 'NONE'`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockAssignmentId" uuid`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockScore" integer`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockVideoId" uuid`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockPercent" integer`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "video_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "video_id" uuid NOT NULL, "student_id" uuid NOT NULL, "watchedSeconds" integer NOT NULL DEFAULT 0, "durationSeconds" integer NOT NULL DEFAULT 0, "watchedPercent" integer NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_video_progress_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_video_progress_video_student" UNIQUE ("video_id", "student_id"))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockScore"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockAssignmentId"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockRule"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockPercent"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockVideoId"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockScore"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockAssignmentId"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockRule"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockPercent"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockVideoId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "video_progress"`);
  }
}
