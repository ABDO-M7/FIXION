import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseHierarchyFields1760000012000 implements MigrationInterface {
  name = 'AddCourseHierarchyFields1760000012000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "chapterName" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "lessonName" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "contentOrder" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "chapterName" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "lessonName" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "contentOrder" integer NOT NULL DEFAULT 0`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "contentOrder"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "lessonName"`);
    await queryRunner.query(`ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "chapterName"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "contentOrder"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "lessonName"`);
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "chapterName"`);
  }
}
