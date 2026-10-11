import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCodeTypesAndEnrollmentExpiry1760000017000 implements MigrationInterface {
  name = 'AddCodeTypesAndEnrollmentExpiry1760000017000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add codeType enum to subscription_codes
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE code_type_enum AS ENUM ('timed', 'snapshot', 'chapter');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_codes"
        ADD COLUMN IF NOT EXISTS "codeType" code_type_enum NOT NULL DEFAULT 'timed',
        ADD COLUMN IF NOT EXISTS "durationDays" integer NULL,
        ADD COLUMN IF NOT EXISTS "accessScope" jsonb NULL
    `);

    // 2. Add per-enrollment expiry and snapshot columns to course_enrollments
    await queryRunner.query(`
      ALTER TABLE "course_enrollments"
        ADD COLUMN IF NOT EXISTS "expiresAt" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "snapshotAt" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "codeType" code_type_enum NOT NULL DEFAULT 'timed',
        ADD COLUMN IF NOT EXISTS "accessScope" jsonb NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_enrollments"
        DROP COLUMN IF EXISTS "expiresAt",
        DROP COLUMN IF EXISTS "snapshotAt",
        DROP COLUMN IF EXISTS "codeType",
        DROP COLUMN IF EXISTS "accessScope"
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_codes"
        DROP COLUMN IF EXISTS "codeType",
        DROP COLUMN IF EXISTS "durationDays",
        DROP COLUMN IF EXISTS "accessScope"
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS code_type_enum`);
  }
}
