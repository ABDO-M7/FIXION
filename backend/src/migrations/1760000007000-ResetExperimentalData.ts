import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetExperimentalData1760000007000 implements MigrationInterface {
  name = 'ResetExperimentalData1760000007000';

  async up(_queryRunner: QueryRunner): Promise<void> {
    // Destructive resets must never run automatically in production.
  }

  async down(): Promise<void> {
    // Data deletion cannot be reversed without a backup.
  }
}
