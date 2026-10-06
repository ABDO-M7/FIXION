import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImportLegacyTeacherNames1760000006000 implements MigrationInterface {
  name = 'ImportLegacyTeacherNames1760000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const legacyRows = await queryRunner.query(`
      SELECT DISTINCT trim("teacherName") AS name
      FROM "subscription_codes"
      WHERE "teacherName" IS NOT NULL AND trim("teacherName") <> ''
      UNION
      SELECT DISTINCT trim("teacherName") AS name
      FROM "course_enrollments"
      WHERE "teacherName" IS NOT NULL AND trim("teacherName") <> ''
    `);

    for (const row of legacyRows as Array<{ name: string }>) {
      const existingUsers = await queryRunner.query(
        `SELECT "id", "role" FROM "users" WHERE lower(trim("name")) = lower($1)`,
        [row.name],
      );

      const existingTeacher = existingUsers.find((user: { role: string }) => user.role === 'teacher');
      if (existingTeacher) {
        continue;
      }

      // Do not guess when the legacy name already belongs to another role.
      if (existingUsers.length > 0) {
        continue;
      }

      await queryRunner.query(
        `
          INSERT INTO "users"
            ("id", "email", "passwordHash", "name", "role", "isActive", "isVerified", "subjects", "permissions")
          VALUES ($1, NULL, NULL, $2, 'teacher', true, false, '[]'::jsonb, '{}'::jsonb)
        `,
        [randomUUID(), row.name],
      );
    }

    await queryRunner.query(`
      UPDATE "subscription_codes" c
      SET "teacher_id" = u."id"
      FROM "users" u
      WHERE c."teacher_id" IS NULL
        AND c."teacherName" IS NOT NULL
        AND u."role" = 'teacher'
        AND lower(trim(u."name")) = lower(trim(c."teacherName"))
    `);

    await queryRunner.query(`
      UPDATE "course_enrollments" e
      SET "teacher_id" = u."id"
      FROM "users" u
      WHERE e."teacher_id" IS NULL
        AND e."teacherName" IS NOT NULL
        AND u."role" = 'teacher'
        AND lower(trim(u."name")) = lower(trim(e."teacherName"))
    `);
  }

  async down(): Promise<void> {
    // This data migration is intentionally irreversible. Removing imported users
    // could delete or detach legitimate assignments made after the migration.
  }
}
