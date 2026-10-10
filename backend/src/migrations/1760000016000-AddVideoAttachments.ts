import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoAttachments1760000016000 implements MigrationInterface {
  name = 'AddVideoAttachments1760000016000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "attachments"`,
    );
  }
}
