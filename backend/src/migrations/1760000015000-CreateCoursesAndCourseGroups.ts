import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoursesAndCourseGroups1760000015000 implements MigrationInterface {
  name = 'CreateCoursesAndCourseGroups1760000015000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "color" varchar(30),
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_courses_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_courses_name" ON "courses" ("name")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "course_groups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "courseName" varchar(150) NOT NULL,
        "groupName" varchar(150) NOT NULL,
        "teacher_id" uuid,
        "teacherName" varchar(255),
        "schedule" varchar(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_course_groups_course_group" UNIQUE ("courseName", "groupName"),
        CONSTRAINT "FK_course_groups_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_course_groups_courseName" ON "course_groups" ("courseName")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_course_groups_groupName" ON "course_groups" ("groupName")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_course_groups_teacher_id" ON "course_groups" ("teacher_id")`);

    // Seed default subjects
    await queryRunner.query(`
      INSERT INTO "courses" ("name", "color")
      VALUES
        ('فيزيا', '#6366f1'),
        ('رياضه', '#10b981'),
        ('احصاء', '#f59e0b'),
        ('عربي', '#ef4444'),
        ('برمجه', '#8b5cf6')
      ON CONFLICT ("name") DO NOTHING
    `);

    // Backfill any existing distinct courses from enrollments, assignments, and videos
    await queryRunner.query(`
      INSERT INTO "courses" ("name")
      SELECT DISTINCT "courseName" FROM "course_enrollments" WHERE "courseName" IS NOT NULL AND TRIM("courseName") != ''
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "courses" ("name")
      SELECT DISTINCT "courseName" FROM "assignments" WHERE "courseName" IS NOT NULL AND TRIM("courseName") != ''
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "courses" ("name")
      SELECT DISTINCT "courseName" FROM "course_videos" WHERE "courseName" IS NOT NULL AND TRIM("courseName") != ''
      ON CONFLICT ("name") DO NOTHING
    `);

    // Backfill any existing groups
    await queryRunner.query(`
      INSERT INTO "course_groups" ("courseName", "groupName", "teacher_id", "teacherName")
      SELECT DISTINCT "courseName", "groupName", "teacher_id", "teacherName"
      FROM "course_enrollments"
      WHERE "courseName" IS NOT NULL AND "groupName" IS NOT NULL AND TRIM("courseName") != '' AND TRIM("groupName") != ''
      ON CONFLICT ("courseName", "groupName") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "course_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courses"`);
  }
}
