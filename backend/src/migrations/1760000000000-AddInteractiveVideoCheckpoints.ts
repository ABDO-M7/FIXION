import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInteractiveVideoCheckpoints1760000000000 implements MigrationInterface {
  name = 'AddInteractiveVideoCheckpoints1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      ALTER TABLE "course_videos"
        ADD COLUMN IF NOT EXISTS "provider" varchar(30) NOT NULL DEFAULT 'youtube',
        ADD COLUMN IF NOT EXISTS "providerVideoId" varchar(255)
    `);
    await queryRunner.query(`ALTER TABLE "course_videos" ALTER COLUMN "youtubeVideoId" DROP NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "video_checkpoints" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "video_id" uuid,
        "videoId" uuid NOT NULL,
        "timestampSeconds" integer NOT NULL,
        "orderIndex" integer NOT NULL DEFAULT 0,
        "prompt" text NOT NULL,
        "type" varchar(20) NOT NULL DEFAULT 'MCQ',
        "options" jsonb DEFAULT '[]'::jsonb,
        "correctAnswer" text,
        "solutionText" text,
        "solutionUrl" varchar(500),
        "requireSolutionUpload" boolean NOT NULL DEFAULT false,
        "showSolutionAfterAnswer" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_video_checkpoints_video" FOREIGN KEY ("video_id") REFERENCES "course_videos"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_video_checkpoints_videoId" ON "video_checkpoints" ("videoId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "video_checkpoint_responses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "checkpoint_id" uuid,
        "checkpointId" uuid NOT NULL,
        "video_id" uuid,
        "videoId" uuid NOT NULL,
        "student_id" uuid,
        "studentId" uuid NOT NULL,
        "answerText" text,
        "attachments" jsonb DEFAULT '[]'::jsonb,
        "isCorrect" boolean NOT NULL DEFAULT false,
        "attempts" integer NOT NULL DEFAULT 0,
        "submittedAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_video_response_checkpoint" FOREIGN KEY ("checkpoint_id") REFERENCES "video_checkpoints"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_video_response_video" FOREIGN KEY ("video_id") REFERENCES "course_videos"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_video_response_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_video_response_checkpoint_student" UNIQUE ("checkpointId", "studentId")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_video_responses_checkpointId" ON "video_checkpoint_responses" ("checkpointId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_video_responses_videoId" ON "video_checkpoint_responses" ("videoId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_video_responses_studentId" ON "video_checkpoint_responses" ("studentId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "video_checkpoint_responses"');
    await queryRunner.query('DROP TABLE IF EXISTS "video_checkpoints"');
    await queryRunner.query('ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "providerVideoId"');
    await queryRunner.query('ALTER TABLE "course_videos" DROP COLUMN IF EXISTS "provider"');
  }
}
