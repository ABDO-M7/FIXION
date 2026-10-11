import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuardianAndAccurateProgress1760000018000 implements MigrationInterface {
  name = 'AddGuardianAndAccurateProgress1760000018000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parentPhone" varchar(30)`);
    await queryRunner.query(`ALTER TABLE "video_progress" ADD COLUMN IF NOT EXISTS "watchedRanges" jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`ALTER TABLE "video_progress" ADD COLUMN IF NOT EXISTS "lastPositionSeconds" double precision`);
    await queryRunner.query(`ALTER TABLE "video_progress" ADD COLUMN IF NOT EXISTS "opened" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "video_progress" ADD COLUMN IF NOT EXISTS "openedAttachments" jsonb NOT NULL DEFAULT '[]'::jsonb`);

    // Old progress stored the furthest playback position, not time actually watched.
    await queryRunner.query(`
      UPDATE "video_progress"
      SET "watchedSeconds" = 0,
          "watchedPercent" = 0,
          "watchedRanges" = '[]'::jsonb,
          "lastPositionSeconds" = NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "video_progress" DROP COLUMN IF EXISTS "opened"`);
    await queryRunner.query(`ALTER TABLE "video_progress" DROP COLUMN IF EXISTS "openedAttachments"`);
    await queryRunner.query(`ALTER TABLE "video_progress" DROP COLUMN IF EXISTS "lastPositionSeconds"`);
    await queryRunner.query(`ALTER TABLE "video_progress" DROP COLUMN IF EXISTS "watchedRanges"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "parentPhone"`);
  }
}
