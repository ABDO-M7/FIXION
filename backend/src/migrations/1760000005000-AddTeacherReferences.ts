import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeacherReferences1760000005000 implements MigrationInterface {
  name = 'AddTeacherReferences1760000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "subscription_codes" ADD COLUMN IF NOT EXISTS "teacher_id" uuid');
    await queryRunner.query('ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "teacher_id" uuid');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_subscription_codes_teacher') THEN
          ALTER TABLE "subscription_codes"
            ADD CONSTRAINT "FK_subscription_codes_teacher"
            FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_course_enrollments_teacher') THEN
          ALTER TABLE "course_enrollments"
            ADD CONSTRAINT "FK_course_enrollments_teacher"
            FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_subscription_codes_teacher_id" ON "subscription_codes" ("teacher_id")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_course_enrollments_teacher_id" ON "course_enrollments" ("teacher_id")');
    await queryRunner.query(`
      UPDATE "subscription_codes" c
      SET "teacher_id" = u.id
      FROM "users" u
      WHERE c."teacher_id" IS NULL
        AND c."teacherName" IS NOT NULL
        AND u.role = 'teacher'
        AND u.name = c."teacherName"
    `);
    await queryRunner.query(`
      UPDATE "course_enrollments" e
      SET "teacher_id" = u.id
      FROM "users" u
      WHERE e."teacher_id" IS NULL
        AND e."teacherName" IS NOT NULL
        AND u.role = 'teacher'
        AND u.name = e."teacherName"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "course_enrollments" DROP CONSTRAINT IF EXISTS "FK_course_enrollments_teacher"');
    await queryRunner.query('ALTER TABLE "subscription_codes" DROP CONSTRAINT IF EXISTS "FK_subscription_codes_teacher"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_course_enrollments_teacher_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_subscription_codes_teacher_id"');
    await queryRunner.query('ALTER TABLE "course_enrollments" DROP COLUMN IF EXISTS "teacher_id"');
    await queryRunner.query('ALTER TABLE "subscription_codes" DROP COLUMN IF EXISTS "teacher_id"');
  }
}
