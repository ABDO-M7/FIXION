import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { Course } from './entities/course.entity';
import { CourseGroup } from './entities/course-group.entity';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { User } from '../users/entities/user.entity';
import { VideoProgress } from '../videos/entities/video-progress.entity';
import { CourseVideo } from '../videos/entities/course-video.entity';
import { VideoCheckpoint } from '../videos/entities/video-checkpoint.entity';
import { VideoResponse } from '../videos/entities/video-response.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      AssignmentSubmission,
      QuizQuestion,
      Course,
      CourseGroup,
      CourseEnrollment,
      User,
      VideoProgress,
      CourseVideo,
      VideoCheckpoint,
      VideoResponse,
    ]),
    forwardRef(() => AiModule),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService, TypeOrmModule],
})
export class AssignmentsModule {}

