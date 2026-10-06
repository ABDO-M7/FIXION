import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentGroup1760000004000 implements MigrationInterface {
  name = 'AddAppointmentGroup1760000004000';
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "groupName" varchar`); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "groupName"`); }
}
