import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { CourseVideo } from './entities/course-video.entity';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseVideo, CourseEnrollment])],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
