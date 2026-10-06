import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffRoles1760000002000 implements MigrationInterface {
  name = 'AddStaffRoles1760000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE varchar USING "role"::text`);

    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('student', 'team_member', 'teacher', 'assistant', 'admin')
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "users_role_enum" USING "role"::"users_role_enum"
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'student'`);

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assignedTeacherId" uuid`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_assigned_teacher"
        FOREIGN KEY ("assignedTeacherId") REFERENCES "users"("id")
        ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_assigned_teacher"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "assignedTeacherId"`);

    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'teacher'
      WHERE "role" IN ('team_member', 'assistant')
    `);

    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE varchar USING "role"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('student', 'teacher', 'admin')`);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "users_role_enum" USING "role"::"users_role_enum"
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'student'`);
  }
}
