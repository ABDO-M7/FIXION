import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenProductionConstraints1760000011000 implements MigrationInterface {
  name = 'HardenProductionConstraints1760000011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicateConstraints = [
      ['course_enrollments', 'FK_course_enrollments_teacher'],
      ['subscription_codes', 'FK_subscription_codes_teacher'],
      ['users', 'FK_users_assigned_teacher'],
    ];

    for (const [table, constraint] of duplicateConstraints) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`,
      );
    }

    const duplicateIndexes = [
      ['course_enrollments', 'IDX_course_enrollments_teacher_id'],
      ['subscription_codes', 'IDX_subscription_codes_teacher_id'],
    ];

    for (const [table, index] of duplicateIndexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
    }

    const requiredColumns = [
      ['answers', 'question_id'],
      ['answers', 'teacher_id'],
      ['appointments', 'student_id'],
      ['assignment_submissions', 'assignment_id'],
      ['assignment_submissions', 'student_id'],
      ['assignments', 'teacher_id'],
      ['course_enrollments', 'student_id'],
      ['course_videos', 'teacher_id'],
      ['notifications', 'user_id'],
      ['questions', 'student_id'],
      ['quiz_questions', 'assignment_id'],
      ['subscriptions', 'user_id'],
      ['subscription_codes', 'created_by'],
    ];

    for (const [table, column] of requiredColumns) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_course_enrollments_student_course_group_teacher"
      ON "course_enrollments"
        ("student_id", "courseName", "groupName", "teacher_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_course_enrollments_student_course_group_teacher"
    `);
  }
}
