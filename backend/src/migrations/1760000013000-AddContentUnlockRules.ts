import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentUnlockRules1760000013000 implements MigrationInterface {
  name = 'AddContentUnlockRules1760000013000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockRule" varchar(32) NOT NULL DEFAULT 'NONE'`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockAssignmentId" uuid`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "unlockScore" integer`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockRule" varchar(32) NOT NULL DEFAULT 'NONE'`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockAssignmentId" uuid`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "unlockScore" integer`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockScore"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockAssignmentId"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "unlockRule"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockScore"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockAssignmentId"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "unlockRule"`);
  }
}

