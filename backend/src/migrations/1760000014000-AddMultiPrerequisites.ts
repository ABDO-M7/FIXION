import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiPrerequisites1760000014000 implements MigrationInterface {
  name = 'AddMultiPrerequisites1760000014000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "prerequisites" jsonb`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "prerequisites" jsonb`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "prerequisites"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "prerequisites"`);
  }
}
