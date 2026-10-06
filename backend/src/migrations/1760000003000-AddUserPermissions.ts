import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPermissions1760000003000 implements MigrationInterface {
  name = 'AddUserPermissions1760000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" jsonb NOT NULL DEFAULT '{}'::jsonb`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "permissions"`);
  }
}
