import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTeacherEmailOptional1760000001000 implements MigrationInterface {
  name = 'MakeTeacherEmailOptional1760000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL');
  }
}
