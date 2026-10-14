import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandProviderVideoId1760000019000 implements MigrationInterface {
  name = 'ExpandProviderVideoId1760000019000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_videos" ALTER COLUMN "providerVideoId" TYPE text`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_videos" ALTER COLUMN "providerVideoId" TYPE varchar(255)`,
    );
  }
}
