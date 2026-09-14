import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { User } from '../users/entities/user.entity';
import { CourseVideo } from './entities/course-video.entity';

type CreateVideoDto = {
  courseName: string;
  groupName: string;
  title: string;
  description?: string;
  youtubeUrl: string;
};

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(CourseVideo) private readonly videosRepo: Repository<CourseVideo>,
    @InjectRepository(CourseEnrollment) private readonly enrollmentsRepo: Repository<CourseEnrollment>,
  ) {}

  async create(dto: CreateVideoDto, teacher: User) {
    const title = dto.title?.trim();
    if (!dto.courseName?.trim() || !dto.groupName?.trim() || !title) {
      throw new BadRequestException('Course, group, and title are required');
    }
    const youtubeVideoId = this.extractYoutubeId(dto.youtubeUrl);
    return this.videosRepo.save(this.videosRepo.create({
      courseName: dto.courseName.trim(),
      groupName: dto.groupName.trim(),
      title,
      description: dto.description?.trim() || null,
      youtubeVideoId,
      teacherId: teacher.id,
    }));
  }

  async listForTeacher(courseName: string, groupName: string, teacherId: string) {
    return this.videosRepo.find({
      where: { courseName, groupName, teacherId },
      order: { createdAt: 'DESC' },
    });
  }

  async listForStudent(courseName: string, groupName: string, studentId: string) {
    const enrollment = await this.enrollmentsRepo.findOne({ where: { courseName, groupName, studentId } });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this course group');
    return this.videosRepo.find({ where: { courseName, groupName }, order: { createdAt: 'DESC' } });
  }

  async remove(id: string, teacherId: string) {
    const video = await this.videosRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.teacherId !== teacherId) throw new ForbiddenException('You can only delete your own videos');
    await this.videosRepo.delete(id);
    return { message: 'Video deleted' };
  }

  private extractYoutubeId(value: string): string {
    if (!value?.trim()) throw new BadRequestException('A YouTube link is required');
    let url: URL;
    try { url = new URL(value.trim()); } catch { throw new BadRequestException('Enter a valid YouTube link'); }
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || null;
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      id = url.searchParams.get('v') || (url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null);
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new BadRequestException('Enter a valid YouTube video link');
    return id;
  }
}
