import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { User } from '../users/entities/user.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { AssignmentSubmission } from '../assignments/entities/assignment-submission.entity';
import { CourseVideo } from './entities/course-video.entity';
import { VideoCheckpoint } from './entities/video-checkpoint.entity';
import { VideoResponse } from './entities/video-response.entity';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseVideo, CourseEnrollment, VideoCheckpoint, VideoResponse, User, Assignment, AssignmentSubmission])],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
