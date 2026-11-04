import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CourseVideo } from './entities/course-video.entity';
import { VideoCheckpoint, VideoCheckpointOption, VideoCheckpointType } from './entities/video-checkpoint.entity';
import { VideoResponse } from './entities/video-response.entity';
import { canManageOwnedWork, resolveStaffScope, workOwnerId } from '../../common/staff-access';
import { Assignment } from '../assignments/entities/assignment.entity';
import { CourseGroup } from '../assignments/entities/course-group.entity';
import { AssignmentSubmission } from '../assignments/entities/assignment-submission.entity';
import { UnlockRuleType } from '../learning/unlock-rule';
import { VideoProgress } from './entities/video-progress.entity';
import { VideoConfusionMark } from './entities/video-confusion.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { courseContentVersionKey, studentCourseCacheKey, studentCourseVersionKey } from '../../common/cache/course-cache-keys';
import {
  assertCourseContentAccess,
  assertCourseContentAccessAcrossEnrollments,
  assertEnrollmentActive,
  canAccessCourseContent,
  canAccessCourseContentAcrossEnrollments,
  isEnrollmentExpired,
} from '../subscriptions/access-scope';
import { CodeType } from '../subscriptions/entities/subscription-code.entity';

type CreateVideoDto = {
  courseName: string;
  groupName: string;
  title: string;
  description?: string;
  provider?: string;
  sourceUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  chapterName?: string;
  lessonName?: string;
  contentOrder?: number;
  unlockRule?: UnlockRuleType;
  unlockAssignmentId?: string;
  unlockScore?: number;
  unlockVideoId?: string;
  unlockPercent?: number;
  prerequisites?: Array<{
    unlockRule: string;
    unlockVideoId?: string | null;
    unlockPercent?: number | null;
    unlockAssignmentId?: string | null;
    unlockScore?: number | null;
  }>;
  attachments?: string[];
};

type CheckpointDto = {
  timestampSeconds?: number;
  prompt?: string;
  type?: VideoCheckpointType | string;
  options?: VideoCheckpointOption[];
  correctAnswer?: string;
  solutionText?: string;
  solutionUrl?: string;
  requireSolutionUpload?: boolean;
  showSolutionAfterAnswer?: boolean;
  orderIndex?: number;
};

type AnswerDto = { answerText?: string; answer?: string; attachments?: string[] };

type ParsedSource = {
  provider: 'youtube' | 'vimeo' | 'wistia' | 'bunny' | 'hls';
  providerVideoId: string;
};

@Injectable()
export class VideosService implements OnModuleInit {
  constructor(
    @InjectRepository(CourseVideo) private readonly videosRepo: Repository<CourseVideo>,
    @InjectRepository(CourseEnrollment) private readonly enrollmentsRepo: Repository<CourseEnrollment>,
    @InjectRepository(VideoCheckpoint) private readonly checkpointsRepo: Repository<VideoCheckpoint>,
    @InjectRepository(VideoResponse) private readonly responsesRepo: Repository<VideoResponse>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Assignment) private readonly assignmentsRepo: Repository<Assignment>,
    @InjectRepository(CourseGroup) private readonly courseGroupsRepo: Repository<CourseGroup>,
    @InjectRepository(AssignmentSubmission) private readonly submissionsRepo: Repository<AssignmentSubmission>,
    @InjectRepository(VideoProgress) private readonly progressRepo: Repository<VideoProgress>,
    private readonly cache: RedisCacheService,
    @Optional() @InjectRepository(VideoConfusionMark) private readonly confusionRepo?: Repository<VideoConfusionMark>,
  ) {}

  async onModuleInit() {
    if (!this.confusionRepo?.query) return;
    try {
      await this.confusionRepo.query(`
        CREATE TABLE IF NOT EXISTS "video_confusion_marks" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "video_id" uuid NOT NULL,
          "student_id" uuid NOT NULL,
          "startSeconds" integer NOT NULL DEFAULT 0,
          "endSeconds" integer NOT NULL DEFAULT 0,
          "note" text,
          "resolved" boolean NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_video_confusion_marks_id" PRIMARY KEY ("id")
        );
      `);
      await this.confusionRepo.query(`
        CREATE INDEX IF NOT EXISTS "IDX_video_confusion_video_id" ON "video_confusion_marks" ("video_id");
      `);
      await this.confusionRepo.query(`
        CREATE INDEX IF NOT EXISTS "IDX_video_confusion_student_id" ON "video_confusion_marks" ("student_id");
      `);
    } catch {
      // ignore if table creation not supported in test mock
    }
  }

  async create(dto: CreateVideoDto, teacher: User) {
    const title = dto.title?.trim();
    if (!dto.courseName?.trim() || !dto.groupName?.trim() || !title) {
      throw new BadRequestException('Course, group, and title are required');
    }
    const courseName = dto.courseName.trim();
    const scope = await resolveStaffScope(this.usersRepo, teacher);
    if (scope.type === 'subjects' && !scope.subjects.includes(courseName)) {
      throw new ForbiddenException('This course is not in your subject');
    }
    let source: { provider: string; providerVideoId: string | null };
    if (dto.provider === 'document' || dto.provider === 'pdf') {
      const firstAttachment = Array.isArray(dto.attachments) && dto.attachments.length > 0 ? dto.attachments[0] : null;
      source = {
        provider: 'document',
        providerVideoId: dto.sourceUrl || firstAttachment || 'document',
      };
    } else {
      source = this.parseVideoSource(dto.sourceUrl || dto.videoUrl || dto.youtubeUrl, dto.provider);
    }
    const video = await this.videosRepo.save(this.videosRepo.create({
      courseName,
      groupName: dto.groupName.trim(),
      title,
      description: dto.description?.trim() || null,
      chapterName: dto.chapterName?.trim() || null,
      lessonName: dto.lessonName?.trim() || null,
      contentOrder: Number.isFinite(Number(dto.contentOrder)) ? Number(dto.contentOrder) : 0,
      unlockRule: dto.unlockRule || UnlockRuleType.NONE,
      unlockAssignmentId: dto.unlockAssignmentId || null,
      unlockScore: dto.unlockScore ?? null,
      unlockVideoId: dto.unlockVideoId || null,
      unlockPercent: dto.unlockPercent ?? null,
      prerequisites: Array.isArray(dto.prerequisites) && dto.prerequisites.length > 0 ? dto.prerequisites : null,
      provider: source.provider,
      providerVideoId: source.providerVideoId,
      youtubeVideoId: source.provider === 'youtube' ? source.providerVideoId : null,
      attachments: Array.isArray(dto.attachments) ? dto.attachments : [],
      teacherId: workOwnerId(scope, teacher),
    }));
    await this.cache.bumpVersion(courseContentVersionKey(courseName, dto.groupName.trim()));
    return video;
  }

  async listForTeacher(courseName: string, groupName: string, actor: User, requestedTeacherId?: string) {
    const scope = await resolveStaffScope(this.usersRepo, actor);
    if (scope.type === 'subjects' && !scope.subjects.includes(courseName)) return [];
    if (scope.type === 'teacher') {
      if (!scope.teacherId) return [];
      const [assignedGroup, anyGroupRecord, ownedAssignment, ownedVideo, enrollment, teacherUser] = await Promise.all([
        this.courseGroupsRepo.findOne({
          where: [
            { courseName, groupName, teacherId: scope.teacherId },
            ...(scope.teacherName ? [{ courseName, groupName, teacherName: scope.teacherName }] : []),
          ],
        }),
        this.courseGroupsRepo.findOne({ where: { courseName, groupName } }),
        this.assignmentsRepo.findOne({ where: { courseName, groupName, teacherId: scope.teacherId } }),
        this.videosRepo.findOne({ where: { courseName, groupName, teacherId: scope.teacherId } }),
        this.enrollmentsRepo.createQueryBuilder('e')
          .where('e.courseName = :courseName AND e.groupName = :groupName', { courseName, groupName })
          .andWhere('(e.teacherId = :teacherId OR (e.teacherId IS NULL AND e.teacherName = :teacherName))', {
            teacherId: scope.teacherId,
            teacherName: scope.teacherName,
          })
          .getOne(),
        this.usersRepo?.findOne ? this.usersRepo.findOne({ where: { id: scope.teacherId } }) : Promise.resolve(null),
      ]);
      const teachesSubject = Array.isArray(teacherUser?.subjects) && teacherUser.subjects.includes(courseName);
      const ownedByAnotherTeacher = Boolean(anyGroupRecord?.teacherId && anyGroupRecord.teacherId !== scope.teacherId);
      const allowedBySubject = teachesSubject && !ownedByAnotherTeacher;
      if (!assignedGroup && !ownedAssignment && !ownedVideo && !enrollment && !allowedBySubject) return [];
    }
    const videos = await this.videosRepo.find({
      where: {
        courseName,
        groupName,
        ...(actor.role === UserRole.ADMIN && requestedTeacherId ? { teacherId: requestedTeacherId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
    if (!videos.length) return [];
    const videoIds = videos.map(video => video.id);
    const allCheckpoints = await this.checkpointsRepo.find({
      where: { videoId: In(videoIds) },
      order: { orderIndex: 'ASC', timestampSeconds: 'ASC' },
    });
    const checkpointsByVideoId = new Map<string, VideoCheckpoint[]>();
    for (const checkpoint of allCheckpoints) {
      const list = checkpointsByVideoId.get(checkpoint.videoId) || [];
      list.push(checkpoint);
      checkpointsByVideoId.set(checkpoint.videoId, list);
    }
    return videos.map(video => ({
      ...this.publicVideo(video),
      checkpoints: checkpointsByVideoId.get(video.id) || [],
    }));
  }

  async listForStudent(courseName: string, groupName: string, studentId: string) {
    const enrollments = await this.getStudentEnrollments(courseName, groupName, studentId);
    const videos = await this.cache.remember(
      studentCourseCacheKey('videos', courseName, groupName, studentId),
      20,
      [
        courseContentVersionKey(courseName, groupName),
        studentCourseVersionKey(courseName, groupName, studentId),
      ],
      async () => {
        const videos = await this.videosRepo.find({ where: { courseName, groupName }, order: { createdAt: 'DESC' } });
        if (!videos.length) return [];

        const videoIds = videos.map(video => video.id);
        const progressVideoIds = new Set<string>(videoIds);
        const prereqAssignmentIds = new Set<string>();

        for (const video of videos) {
          if (video.unlockVideoId) progressVideoIds.add(video.unlockVideoId);
          if (video.unlockAssignmentId) prereqAssignmentIds.add(video.unlockAssignmentId);
          if (Array.isArray(video.prerequisites)) {
            for (const prereq of video.prerequisites) {
              if (prereq?.unlockVideoId) progressVideoIds.add(prereq.unlockVideoId);
              if (prereq?.unlockAssignmentId) prereqAssignmentIds.add(prereq.unlockAssignmentId);
            }
          }
        }

        const assignmentIdList = Array.from(prereqAssignmentIds);
        const [allCheckpoints, allProgress, allSubmissions, allPrereqAssignments] = await Promise.all([
          this.checkpointsRepo.find({
            where: { videoId: In(videoIds) },
            order: { orderIndex: 'ASC', timestampSeconds: 'ASC' },
          }),
          this.progressRepo.find({
            where: { videoId: In(Array.from(progressVideoIds)), studentId },
          }),
          assignmentIdList.length
            ? this.submissionsRepo.find({ where: { assignmentId: In(assignmentIdList), studentId } })
            : Promise.resolve([] as AssignmentSubmission[]),
          assignmentIdList.length
            ? this.assignmentsRepo.find({ where: { id: In(assignmentIdList) } })
            : Promise.resolve([] as Assignment[]),
        ]);

        const allResponses = allCheckpoints.length
          ? await this.responsesRepo.find({ where: { videoId: In(videoIds), studentId } })
          : [];

        const checkpointsByVideoId = new Map<string, VideoCheckpoint[]>();
        for (const checkpoint of allCheckpoints) {
          const list = checkpointsByVideoId.get(checkpoint.videoId) || [];
          list.push(checkpoint);
          checkpointsByVideoId.set(checkpoint.videoId, list);
        }

        const responsesByVideoId = new Map<string, VideoResponse[]>();
        for (const response of allResponses) {
          const list = responsesByVideoId.get(response.videoId) || [];
          list.push(response);
          responsesByVideoId.set(response.videoId, list);
        }

        const progressMap = new Map<string, VideoProgress>(
          allProgress.map(progress => [progress.videoId, progress]),
        );
        const submissionMap = new Map<string, AssignmentSubmission>(
          allSubmissions.map(submission => [submission.assignmentId, submission]),
        );
        const assignmentMap = new Map<string, Assignment>(
          allPrereqAssignments.map(assignment => [assignment.id, assignment]),
        );

        return videos.map(video => {
          const checkpoints = checkpointsByVideoId.get(video.id) || [];
          const responses = checkpoints.length ? (responsesByVideoId.get(video.id) || []) : [];
          const progress = progressMap.get(video.id);
          const unlock = this.getUnlockStateWithLookup(
            video.unlockRule,
            video.unlockAssignmentId,
            video.unlockScore,
            video.unlockVideoId,
            video.unlockPercent,
            video.prerequisites,
            progressMap,
            submissionMap,
            assignmentMap,
          );
          return {
            ...this.publicVideo(video),
            teacherId: video.teacherId,
            watchedPercent: progress?.watchedPercent || 0,
            opened: progress?.opened || false,
            openedAttachments: progress?.openedAttachments || [],
            ...unlock,
            checkpointCount: checkpoints.length,
            completedCheckpointCount: responses.filter(response => response.isCorrect).length,
          };
        });
      },
    );
    return videos
      .filter(video => canAccessCourseContentAcrossEnrollments(enrollments, video.chapterName, video.lessonName))
      .map(({ teacherId, ...video }) => {
        void teacherId;
        return video;
      });
  }

  async getTeacherCheckpoints(videoId: string, actor: User) {
    const video = await this.getOwnedVideo(videoId, actor);
    return this.checkpointsRepo.find({
      where: { videoId: video.id },
      order: { orderIndex: 'ASC', timestampSeconds: 'ASC' },
    });
  }

  async createCheckpoint(videoId: string, dto: CheckpointDto, actor: User) {
    const video = await this.getOwnedVideo(videoId, actor);
    const input = this.validateCheckpoint(dto);
    const orderIndex = dto.orderIndex ?? await this.checkpointsRepo.count({ where: { videoId } });
    const checkpoint = await this.checkpointsRepo.save(this.checkpointsRepo.create({ videoId: video.id, ...input, orderIndex }));
    await this.cache.bumpVersion(courseContentVersionKey(video.courseName, video.groupName));
    return checkpoint;
  }

  async updateCheckpoint(videoId: string, checkpointId: string, dto: CheckpointDto, actor: User) {
    const video = await this.getOwnedVideo(videoId, actor);
    const checkpoint = await this.checkpointsRepo.findOne({ where: { id: checkpointId, videoId } });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    Object.assign(checkpoint, this.validateCheckpoint(dto, checkpoint));
    if (dto.orderIndex !== undefined) checkpoint.orderIndex = dto.orderIndex;
    const saved = await this.checkpointsRepo.save(checkpoint);
    await this.cache.bumpVersion(courseContentVersionKey(video.courseName, video.groupName));
    return saved;
  }

  async removeCheckpoint(videoId: string, checkpointId: string, actor: User) {
    const video = await this.getOwnedVideo(videoId, actor);
    const checkpoint = await this.checkpointsRepo.findOne({ where: { id: checkpointId, videoId } });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    await this.checkpointsRepo.delete(checkpoint.id);
    await this.cache.bumpVersion(courseContentVersionKey(video.courseName, video.groupName));
    return { message: 'Checkpoint deleted' };
  }

  async getStudentExperience(videoId: string, student: User) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    await this.assertEnrollment(video.courseName, video.groupName, student.id, video.chapterName, video.lessonName);
    const unlock = await this.getUnlockState(video.unlockRule, video.unlockAssignmentId, video.unlockScore, video.unlockVideoId, video.unlockPercent, student.id, video.prerequisites);
    if (unlock.isLocked) throw new ForbiddenException(unlock.lockReason);
    if (this.progressRepo?.findOne && this.progressRepo?.save) {
      const existingProgress = await this.progressRepo.findOne({ where: { videoId, studentId: student.id } });
      if (!existingProgress) {
        const createdProgress = this.progressRepo.create
          ? this.progressRepo.create({ videoId, studentId: student.id, watchedSeconds: 0, durationSeconds: 0, watchedPercent: 0, opened: true })
          : ({ videoId, studentId: student.id, watchedSeconds: 0, durationSeconds: 0, watchedPercent: 0, opened: true } as VideoProgress);
        await this.progressRepo.save(createdProgress);
        await this.cache?.bumpVersion?.(studentCourseVersionKey(video.courseName, video.groupName, student.id));
      } else if (!existingProgress.opened) {
        existingProgress.opened = true;
        await this.progressRepo.save(existingProgress);
        await this.cache?.bumpVersion?.(studentCourseVersionKey(video.courseName, video.groupName, student.id));
      }
    }
    const checkpoints = await this.checkpointsRepo.find({
      where: { videoId },
      order: { orderIndex: 'ASC', timestampSeconds: 'ASC' },
    });
    const responses = checkpoints.length ? await this.responsesRepo.find({ where: { videoId, studentId: student.id } }) : [];
    const responseMap = new Map(responses.map(response => [response.checkpointId, response]));
    const confusionMarks = this.confusionRepo?.find
      ? await this.confusionRepo.find({
          where: { videoId, studentId: student.id },
          order: { startSeconds: 'ASC', createdAt: 'DESC' },
        })
      : [];
    return {
      video: this.publicVideo(video),
      confusionMarks: confusionMarks.map(m => ({
        id: m.id,
        startSeconds: m.startSeconds,
        endSeconds: m.endSeconds,
        note: m.note,
        resolved: m.resolved,
        createdAt: m.createdAt,
      })),
      checkpoints: checkpoints.map(checkpoint => {
        const response = responseMap.get(checkpoint.id);
        const solved = Boolean(response?.isCorrect);
        return {
          id: checkpoint.id,
          timestampSeconds: checkpoint.timestampSeconds,
          orderIndex: checkpoint.orderIndex,
          prompt: checkpoint.prompt,
          type: checkpoint.type,
          options: checkpoint.options || [],
          requireSolutionUpload: checkpoint.requireSolutionUpload,
          showSolutionAfterAnswer: checkpoint.showSolutionAfterAnswer,
          solutionText: solved && checkpoint.showSolutionAfterAnswer ? checkpoint.solutionText : null,
          solutionUrl: solved && checkpoint.showSolutionAfterAnswer ? checkpoint.solutionUrl : null,
          response: response ? { isCorrect: response.isCorrect, attempts: response.attempts, submittedAt: response.submittedAt } : null,
        };
      }),
    };
  }

  async updateProgress(videoId: string, studentId: string, dto: { watchedSeconds: number; durationSeconds: number }) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    await this.assertEnrollment(video.courseName, video.groupName, studentId, video.chapterName, video.lessonName);
    const currentPosition = Number(dto.watchedSeconds);
    const reportedDuration = Number(dto.durationSeconds);
    if (!Number.isFinite(currentPosition) || !Number.isFinite(reportedDuration) || currentPosition < 0 || reportedDuration < 1) {
      throw new BadRequestException('Valid playback position and duration are required');
    }
    const durationSeconds = Math.max(1, Math.floor(reportedDuration));
    const position = Math.min(currentPosition, durationSeconds);
    const existing = await this.progressRepo.findOne({ where: { videoId, studentId } });
    const progress = existing || this.progressRepo.create({ videoId, studentId, watchedSeconds: 0, durationSeconds: 0, watchedPercent: 0 });
    progress.opened = true;
    const ranges = [...(progress.watchedRanges || [])];
    let watchedStart: number | null = null;
    const previousPosition = progress.lastPositionSeconds;
    if (previousPosition !== null && previousPosition !== undefined) {
      const elapsed = progress.updatedAt
        ? Math.max(0, (Date.now() - new Date(progress.updatedAt).getTime()) / 1000)
        : 10;
      const advance = position - previousPosition;
      const maxAllowedAdvance = Math.min(35, Math.max(16, elapsed * 2.5 + 5));
      if (advance > 0 && advance <= maxAllowedAdvance) {
        watchedStart = previousPosition;
      } else if (previousPosition <= 15 && ranges.length === 0 && position > 0 && position <= 20) {
        watchedStart = 0;
      }
    } else if (position > 0 && position <= 20) {
      watchedStart = 0;
    }
    if (watchedStart !== null && position > watchedStart) {
      ranges.push([watchedStart, position]);
    }
    ranges.sort((left, right) => left[0] - right[0]);
    const mergedRanges: Array<[number, number]> = [];
    for (const range of ranges) {
      const start = Math.max(0, Math.min(range[0], durationSeconds));
      const end = Math.max(start, Math.min(range[1], durationSeconds));
      const lastRange = mergedRanges[mergedRanges.length - 1];
      if (lastRange && start <= lastRange[1] + 1) {
        lastRange[1] = Math.max(lastRange[1], end);
      } else if (end > start) {
        mergedRanges.push([start, end]);
      }
    }
    const actuallyWatchedSeconds = mergedRanges.reduce((total, [start, end]) => total + end - start, 0);
    progress.watchedRanges = mergedRanges;
    progress.watchedSeconds = Math.floor(actuallyWatchedSeconds);
    progress.durationSeconds = Math.max(progress.durationSeconds || 0, durationSeconds);
    const rawPercent = (actuallyWatchedSeconds / progress.durationSeconds) * 100;
    progress.watchedPercent = actuallyWatchedSeconds >= progress.durationSeconds - 2 || rawPercent >= 98
      ? 100
      : actuallyWatchedSeconds > 0
        ? Math.max(1, Math.min(100, Math.round(rawPercent)))
        : 0;
    progress.lastPositionSeconds = position;
    const saved = await this.progressRepo.save(progress);
    await this.cache.bumpVersion(studentCourseVersionKey(video.courseName, video.groupName, studentId));
    return saved;
  }

  async markDocumentOpened(videoId: string, studentId: string, attachmentIndex?: number) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Course content not found');
    await this.assertEnrollment(video.courseName, video.groupName, studentId, video.chapterName, video.lessonName);
    const progress = await this.progressRepo.findOne({ where: { videoId, studentId } })
      || this.progressRepo.create({ videoId, studentId, watchedSeconds: 0, durationSeconds: 0, watchedPercent: 0 });
    const isDoc = video.provider === 'document' || video.provider === 'pdf';
    if (attachmentIndex !== undefined) {
      if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0 || attachmentIndex >= (video.attachments || []).length) {
        throw new BadRequestException('Invalid course file');
      }
      progress.openedAttachments = Array.from(new Set([...(progress.openedAttachments || []), attachmentIndex]));
      if (isDoc) progress.opened = true;
    } else {
      progress.opened = true;
      if (isDoc && Array.isArray(video.attachments) && video.attachments.length > 0) {
        progress.openedAttachments = Array.from(new Set([...(progress.openedAttachments || []), 0]));
      }
    }
    const saved = await this.progressRepo.save(progress);
    await this.cache.bumpVersion(studentCourseVersionKey(video.courseName, video.groupName, studentId));
    return saved;
  }

  async addConfusionMark(
    videoId: string,
    studentId: string,
    dto: { startSeconds: number; endSeconds: number; note?: string },
  ) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    await this.assertEnrollment(video.courseName, video.groupName, studentId, video.chapterName, video.lessonName);
    if (!this.confusionRepo) {
      throw new BadRequestException('Confusion repository not initialized');
    }

    const rawStart = Math.max(0, Math.floor(Number(dto?.startSeconds) || 0));
    const rawEnd = Math.max(rawStart + 5, Math.floor(Number(dto?.endSeconds) || rawStart + 60));
    const startSeconds = Math.min(rawStart, rawEnd - 1);
    const endSeconds = Math.max(startSeconds + 5, rawEnd);
    const note = dto?.note ? String(dto.note).trim().slice(0, 500) : null;

    const created = this.confusionRepo.create({
      videoId,
      studentId,
      startSeconds,
      endSeconds,
      note,
      resolved: false,
    });
    const saved = await this.confusionRepo.save(created);
    const allMarks = await this.confusionRepo.find({
      where: { videoId, studentId },
      order: { startSeconds: 'ASC', createdAt: 'DESC' },
    });

    return {
      mark: saved,
      confusionMarks: allMarks,
    };
  }

  async removeConfusionMark(videoId: string, markId: string, studentId: string) {
    if (!this.confusionRepo) {
      throw new BadRequestException('Confusion repository not initialized');
    }
    const existing = await this.confusionRepo.findOne({ where: { id: markId, videoId, studentId } });
    if (!existing) throw new NotFoundException('Confusion mark not found');
    await this.confusionRepo.delete(existing.id);
    const allMarks = await this.confusionRepo.find({
      where: { videoId, studentId },
      order: { startSeconds: 'ASC', createdAt: 'DESC' },
    });
    return {
      deletedId: markId,
      confusionMarks: allMarks,
    };
  }

  private formatTimestampLabel(seconds: number): string {
    const safe = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  async getVideoAnalytics(videoId: string, actor: User) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const scope = await resolveStaffScope(this.usersRepo, actor);
    if (scope.type === 'subjects' && !scope.subjects.includes(video.courseName)) {
      throw new ForbiddenException('This course is not in your subject');
    }
    if (scope.type === 'teacher' && scope.teacherId) {
      if (video.teacherId && video.teacherId !== scope.teacherId) {
        const groupRecord = await this.courseGroupsRepo.findOne({
          where: { courseName: video.courseName, groupName: video.groupName },
        });
        if (groupRecord?.teacherId && groupRecord.teacherId !== scope.teacherId) {
          throw new ForbiddenException('You do not have access to this video analytics');
        }
      }
    }

    const [
      rawEnrollments,
      allProgress,
      allConfusionMarks,
      checkpoints,
      checkpointResponses,
      groupAssignments,
    ] = await Promise.all([
      this.enrollmentsRepo.find({
        where: { courseName: video.courseName, groupName: video.groupName },
        relations: ['student'],
        order: { createdAt: 'ASC' },
      }),
      this.progressRepo.find({ where: { videoId } }),
      this.confusionRepo?.find
        ? this.confusionRepo.find({
            where: { videoId },
            order: { startSeconds: 'ASC', createdAt: 'DESC' },
          })
        : Promise.resolve([] as VideoConfusionMark[]),
      this.checkpointsRepo.find({
        where: { videoId },
        order: { orderIndex: 'ASC', timestampSeconds: 'ASC' },
      }),
      this.responsesRepo.find({ where: { videoId } }),
      this.assignmentsRepo.find({
        where: { courseName: video.courseName, groupName: video.groupName },
        order: { contentOrder: 'ASC', createdAt: 'ASC' },
      }),
    ]);

    // Group active enrollments per unique student who can access this video's chapter/lesson
    const enrollmentsByStudent = new Map<string, CourseEnrollment[]>();
    const studentUserMap = new Map<string, User>();
    for (const enr of rawEnrollments) {
      if (!enr.studentId) continue;
      const list = enrollmentsByStudent.get(enr.studentId) || [];
      list.push(enr);
      enrollmentsByStudent.set(enr.studentId, list);
      if (enr.student) studentUserMap.set(enr.studentId, enr.student);
    }

    // Also ensure any student who has progress or confusion marks is loaded in studentUserMap
    const extraStudentIds = new Set<string>();
    for (const p of allProgress) {
      if (p.studentId && !studentUserMap.has(p.studentId)) extraStudentIds.add(p.studentId);
    }
    for (const cm of allConfusionMarks) {
      if (cm.studentId && !studentUserMap.has(cm.studentId)) extraStudentIds.add(cm.studentId);
    }
    if (extraStudentIds.size > 0 && this.usersRepo?.find) {
      const extraUsers = await this.usersRepo.find({ where: { id: In(Array.from(extraStudentIds)) } });
      for (const u of extraUsers) studentUserMap.set(u.id, u);
    }

    const eligibleStudentIds = new Set<string>();
    for (const [studentId, enrs] of enrollmentsByStudent.entries()) {
      const activeEnrs = enrs.filter(e => !isEnrollmentExpired(e));
      const checkList = activeEnrs.length > 0 ? activeEnrs : enrs;
      if (canAccessCourseContentAcrossEnrollments(checkList, video.chapterName, video.lessonName)) {
        eligibleStudentIds.add(studentId);
      }
    }
    for (const p of allProgress) if (p.studentId) eligibleStudentIds.add(p.studentId);
    for (const cm of allConfusionMarks) if (cm.studentId) eligibleStudentIds.add(cm.studentId);

    const studentIdsList = Array.from(eligibleStudentIds);
    const totalEnrolledStudents = studentIdsList.length;

    // Fetch submissions for groupAssignments
    const assignmentIds = groupAssignments.map(a => a.id);
    const allSubmissions = assignmentIds.length > 0
      ? await this.submissionsRepo.find({ where: { assignmentId: In(assignmentIds) } })
      : [];

    // Determine video duration in seconds
    let maxDuration = 0;
    for (const p of allProgress) {
      if (p.durationSeconds > maxDuration) maxDuration = p.durationSeconds;
      if (p.watchedSeconds > maxDuration) maxDuration = p.watchedSeconds;
    }
    for (const cm of allConfusionMarks) {
      if (cm.endSeconds > maxDuration) maxDuration = cm.endSeconds;
    }
    for (const cp of checkpoints) {
      if (cp.timestampSeconds + 60 > maxDuration) maxDuration = cp.timestampSeconds + 60;
    }
    const durationSeconds = maxDuration >= 60 ? maxDuration : 1200; // Default 20 mins (1200s) if no student has reported duration yet

    // Watch Summary
    const progressByStudent = new Map<string, VideoProgress>(allProgress.map(p => [p.studentId, p]));
    let openedCount = 0;
    let watchedAnyCount = 0;
    let completedCount = 0;
    let sumWatchPercent = 0;
    let sumWatchedSeconds = 0;
    const dist = {
      notWatched: 0,
      low: 0,       // 1 - 49%
      medium: 0,    // 50 - 84%
      completed: 0, // 85 - 100%
    };

    for (const sid of studentIdsList) {
      const p = progressByStudent.get(sid);
      const pct = p?.watchedPercent || 0;
      const opened = Boolean(p?.opened || pct > 0);
      if (opened) openedCount++;
      if (pct > 0) watchedAnyCount++;
      if (pct >= 85) completedCount++;
      sumWatchPercent += pct;
      sumWatchedSeconds += p?.watchedSeconds || 0;

      if (pct === 0) dist.notWatched++;
      else if (pct < 50) dist.low++;
      else if (pct < 85) dist.medium++;
      else dist.completed++;
    }

    const averageWatchPercent = totalEnrolledStudents > 0
      ? Math.round(sumWatchPercent / totalEnrolledStudents)
      : 0;
    const averageActiveWatchPercent = watchedAnyCount > 0
      ? Math.round(sumWatchPercent / watchedAnyCount)
      : 0;
    const averageWatchedMinutes = watchedAnyCount > 0
      ? Math.round((sumWatchedSeconds / watchedAnyCount / 60) * 10) / 10
      : 0;

    // Build Timeline Heatmap & Graph Buckets (e.g. 15 to 24 buckets across video duration)
    const bucketCount = Math.min(24, Math.max(12, Math.ceil(durationSeconds / 60)));
    const bucketSize = Math.max(15, Math.ceil(durationSeconds / bucketCount));
    const actualBucketCount = Math.ceil(durationSeconds / bucketSize);

    const timelineBuckets: Array<{
      bucketIndex: number;
      startSeconds: number;
      endSeconds: number;
      timeLabel: string;
      shortLabel: string;
      confusionCount: number;
      studentCount: number;
      watchedCount: number;
      intensityPercent: number;
      students: Array<{
        markId: string;
        studentId: string;
        name: string;
        studentCode: string | null;
        email: string;
        phone: string | null;
        startSeconds: number;
        endSeconds: number;
        rangeLabel: string;
        note: string | null;
        createdAt: Date;
      }>;
    }> = [];

    for (let i = 0; i < actualBucketCount; i++) {
      const bStart = i * bucketSize;
      const bEnd = Math.min(durationSeconds, (i + 1) * bucketSize);
      const overlappingMarks = allConfusionMarks.filter(
        m => m.startSeconds < bEnd && m.endSeconds > bStart,
      );
      const uniqueStudentIdsInBucket = new Set(overlappingMarks.map(m => m.studentId));

      // How many students actually watched this time slice?
      let watchedInSlice = 0;
      for (const p of allProgress) {
        const ranges = Array.isArray(p.watchedRanges) ? p.watchedRanges : [];
        if (ranges.some(([rStart, rEnd]) => rStart < bEnd && rEnd > bStart)) {
          watchedInSlice++;
        } else if (ranges.length === 0 && p.watchedSeconds >= bEnd) {
          watchedInSlice++;
        }
      }

      const studentsInBucket = overlappingMarks.map(m => {
        const u = studentUserMap.get(m.studentId);
        return {
          markId: m.id,
          studentId: m.studentId,
          name: u?.name || 'طالب',
          studentCode: u?.studentId || null,
          email: u?.email || '',
          phone: u?.phone || null,
          startSeconds: m.startSeconds,
          endSeconds: m.endSeconds,
          rangeLabel: `${this.formatTimestampLabel(m.startSeconds)} - ${this.formatTimestampLabel(m.endSeconds)}`,
          note: m.note,
          createdAt: m.createdAt,
        };
      });

      timelineBuckets.push({
        bucketIndex: i,
        startSeconds: bStart,
        endSeconds: bEnd,
        timeLabel: `${this.formatTimestampLabel(bStart)} - ${this.formatTimestampLabel(bEnd)}`,
        shortLabel: this.formatTimestampLabel(bStart),
        confusionCount: overlappingMarks.length,
        studentCount: uniqueStudentIdsInBucket.size,
        watchedCount: watchedInSlice,
        intensityPercent: 0, // computed after max is known
        students: studentsInBucket,
      });
    }

    const maxBucketConfusion = Math.max(1, ...timelineBuckets.map(b => b.confusionCount));
    for (const b of timelineBuckets) {
      b.intensityPercent = b.confusionCount > 0
        ? Math.max(15, Math.round((b.confusionCount / maxBucketConfusion) * 100))
        : 0;
    }

    const peakBucketCandidate = [...timelineBuckets].sort(
      (a, b) => b.confusionCount - a.confusionCount || b.studentCount - a.studentCount,
    )[0];
    const peakBucket = peakBucketCandidate && peakBucketCandidate.confusionCount > 0
      ? {
          startSeconds: peakBucketCandidate.startSeconds,
          endSeconds: peakBucketCandidate.endSeconds,
          timeLabel: peakBucketCandidate.timeLabel,
          confusionCount: peakBucketCandidate.confusionCount,
          studentCount: peakBucketCandidate.studentCount,
        }
      : null;

    const allMarksDetailed = allConfusionMarks.map(m => {
      const u = studentUserMap.get(m.studentId);
      return {
        id: m.id,
        studentId: m.studentId,
        studentName: u?.name || 'طالب',
        studentCode: u?.studentId || null,
        email: u?.email || '',
        phone: u?.phone || null,
        startSeconds: m.startSeconds,
        endSeconds: m.endSeconds,
        rangeLabel: `${this.formatTimestampLabel(m.startSeconds)} → ${this.formatTimestampLabel(m.endSeconds)}`,
        note: m.note,
        createdAt: m.createdAt,
      };
    });

    // Checkpoint Analytics
    const checkpointAnalytics = checkpoints.map(cp => {
      const resps = checkpointResponses.filter(r => r.checkpointId === cp.id);
      const solvedCount = resps.filter(r => r.isCorrect).length;
      const totalAttempts = resps.reduce((acc, r) => acc + (r.attempts || 1), 0);
      const avgAttempts = resps.length > 0 ? Math.round((totalAttempts / resps.length) * 10) / 10 : 0;
      const passRate = resps.length > 0 ? Math.round((solvedCount / resps.length) * 100) : 0;
      return {
        id: cp.id,
        prompt: cp.prompt,
        type: cp.type,
        timestampSeconds: cp.timestampSeconds,
        timeLabel: this.formatTimestampLabel(cp.timestampSeconds),
        attemptedCount: resps.length,
        solvedCount,
        avgAttempts,
        passRate,
      };
    });

    // Lesson & Group Assignments (Quizzes + Homework) Analytics
    const sameLessonAssignments = groupAssignments.filter(
      a =>
        (video.chapterName ? a.chapterName === video.chapterName : true) &&
        (video.lessonName ? a.lessonName === video.lessonName : true),
    );
    const targetAssignments = sameLessonAssignments.length > 0 ? sameLessonAssignments : groupAssignments;

    const lessonAssignmentsAnalytics = targetAssignments.map(a => {
      const subs = allSubmissions.filter(s => s.assignmentId === a.id && eligibleStudentIds.has(s.studentId));
      const submittedCount = subs.length;
      const notSubmittedCount = Math.max(0, totalEnrolledStudents - submittedCount);
      const submissionRate = totalEnrolledStudents > 0
        ? Math.round((submittedCount / totalEnrolledStudents) * 100)
        : 0;
      const gradedSubs = subs.filter(s => s.grade !== null && s.grade !== undefined);
      const maxGrade = a.maxGrade || 100;
      const gradesList = gradedSubs.map(s => Number(s.grade));
      const averageGrade = gradesList.length > 0
        ? Math.round((gradesList.reduce((acc, g) => acc + g, 0) / gradesList.length) * 10) / 10
        : null;
      const averagePercent = averageGrade !== null && maxGrade > 0
        ? Math.round((averageGrade / maxGrade) * 100)
        : null;
      const highestGrade = gradesList.length > 0 ? Math.max(...gradesList) : null;
      const lowestGrade = gradesList.length > 0 ? Math.min(...gradesList) : null;
      const passCount = gradedSubs.filter(s => (Number(s.grade) / Math.max(1, maxGrade)) * 100 >= 50).length;
      const passRate = gradedSubs.length > 0 ? Math.round((passCount / gradedSubs.length) * 100) : null;

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        chapterName: a.chapterName,
        lessonName: a.lessonName,
        isSameLesson: a.chapterName === video.chapterName && a.lessonName === video.lessonName,
        maxGrade,
        submittedCount,
        notSubmittedCount,
        submissionRate,
        gradedCount: gradedSubs.length,
        averageGrade,
        averagePercent,
        highestGrade,
        lowestGrade,
        passCount,
        passRate,
      };
    });

    // Per-Student Comprehensive Breakdown Table
    const studentsTable = studentIdsList.map(sid => {
      const u = studentUserMap.get(sid);
      const p = progressByStudent.get(sid);
      const studentCheckpoints = checkpointResponses.filter(r => r.studentId === sid && r.isCorrect).length;
      const studentMarks = allConfusionMarks
        .filter(m => m.studentId === sid)
        .map(m => ({
          id: m.id,
          startSeconds: m.startSeconds,
          endSeconds: m.endSeconds,
          rangeLabel: `${this.formatTimestampLabel(m.startSeconds)} - ${this.formatTimestampLabel(m.endSeconds)}`,
          note: m.note,
          createdAt: m.createdAt,
        }));

      const studentAssignments = targetAssignments.map(a => {
        const sub = allSubmissions.find(s => s.assignmentId === a.id && s.studentId === sid);
        return {
          assignmentId: a.id,
          title: a.title,
          type: a.type,
          maxGrade: a.maxGrade || 100,
          submitted: Boolean(sub),
          grade: sub?.grade ?? null,
          submittedAt: sub?.submittedAt ?? null,
        };
      });

      return {
        studentId: sid,
        name: u?.name || 'طالب',
        studentCode: u?.studentId || null,
        email: u?.email || '',
        phone: u?.phone || null,
        opened: Boolean(p?.opened || (p?.watchedPercent || 0) > 0),
        watchedPercent: p?.watchedPercent || 0,
        watchedSeconds: p?.watchedSeconds || 0,
        watchedMinutes: Math.round(((p?.watchedSeconds || 0) / 60) * 10) / 10,
        lastPositionSeconds: p?.lastPositionSeconds ?? null,
        updatedAt: p?.updatedAt ?? null,
        completedCheckpoints: studentCheckpoints,
        totalCheckpoints: checkpoints.length,
        confusionMarksCount: studentMarks.length,
        confusionMarks: studentMarks,
        assignments: studentAssignments,
      };
    }).sort((a, b) => b.confusionMarksCount - a.confusionMarksCount || b.watchedPercent - a.watchedPercent);

    return {
      video: {
        ...this.publicVideo(video),
        durationSeconds,
      },
      watchSummary: {
        totalEnrolledStudents,
        openedCount,
        watchedAnyCount,
        completedCount,
        notWatchedCount: dist.notWatched,
        averageWatchPercent,
        averageActiveWatchPercent,
        averageWatchedMinutes,
        watchDistribution: [
          { label: 'لم يشاهد (0%)', count: dist.notWatched, color: '#ef4444' },
          { label: 'مشاهدة ضعيفة (1-49%)', count: dist.low, color: '#f59e0b' },
          { label: 'مشاهدة متوسطة (50-84%)', count: dist.medium, color: '#38bdf8' },
          { label: 'أتم المشاهدة (85-100%)', count: dist.completed, color: '#10b981' },
        ],
      },
      confusionAnalytics: {
        totalConfusionMarks: allConfusionMarks.length,
        uniqueConfusedStudents: new Set(allConfusionMarks.map(m => m.studentId)).size,
        peakBucket,
        timelineBuckets,
        allMarks: allMarksDetailed,
      },
      checkpointAnalytics,
      lessonAssignmentsAnalytics,
      studentsTable,
    };
  }

  async answerCheckpoint(videoId: string, checkpointId: string, student: User, dto: AnswerDto) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    await this.assertEnrollment(video.courseName, video.groupName, student.id, video.chapterName, video.lessonName);
    const checkpoint = await this.checkpointsRepo.findOne({ where: { id: checkpointId, videoId } });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');

    const checkpoints = await this.checkpointsRepo.find({ where: { videoId }, order: { orderIndex: 'ASC', timestampSeconds: 'ASC' } });
    const currentIndex = checkpoints.findIndex(item => item.id === checkpoint.id);
    if (currentIndex > 0) {
      const previous = checkpoints[currentIndex - 1];
      const previousResponse = await this.responsesRepo.findOne({ where: { checkpointId: previous.id, studentId: student.id } });
      if (!previousResponse?.isCorrect) throw new ForbiddenException('Complete the previous checkpoint first');
    }

    const answerText = (dto.answerText ?? dto.answer ?? '').trim();
    const attachments = Array.isArray(dto.attachments) ? dto.attachments.filter(Boolean).slice(0, 10) : [];
    const existing = await this.responsesRepo.findOne({ where: { checkpointId, studentId: student.id } });
    const attempts = (existing?.attempts || 0) + 1;
    let isCorrect = false;
    if (checkpoint.type === VideoCheckpointType.MCQ) {
      isCorrect = Boolean(answerText && checkpoint.correctAnswer && answerText === checkpoint.correctAnswer);
    } else {
      isCorrect = Boolean(answerText || attachments.length > 0);
      if (checkpoint.requireSolutionUpload && attachments.length === 0) isCorrect = false;
    }

    const response = existing || this.responsesRepo.create({ checkpointId, videoId, studentId: student.id });
    response.answerText = answerText || null;
    response.attachments = attachments;
    response.attempts = attempts;
    response.isCorrect = isCorrect;
    await this.responsesRepo.save(response);
    await this.cache.bumpVersion(studentCourseVersionKey(video.courseName, video.groupName, student.id));

    if (!isCorrect) {
      return {
        correct: false,
        canContinue: false,
        attempts,
        message: checkpoint.type === VideoCheckpointType.MCQ
          ? 'That answer is not correct. Try again.'
          : checkpoint.requireSolutionUpload
            ? 'Submit a written answer and upload your solution to continue.'
            : 'Write an answer to continue.',
      };
    }

    const next = checkpoints[currentIndex + 1];
    return {
      correct: true,
      canContinue: true,
      attempts,
      nextCheckpointId: next?.id || null,
      completed: !next,
      solution: checkpoint.showSolutionAfterAnswer ? { text: checkpoint.solutionText, url: checkpoint.solutionUrl } : null,
    };
  }

  async update(id: string, dto: any, actor: User) {
    const video = await this.getOwnedVideo(id, actor);
    if (dto.title !== undefined) video.title = dto.title.trim();
    if (dto.description !== undefined) video.description = dto.description?.trim() || null;
    if (dto.chapterName !== undefined) video.chapterName = dto.chapterName?.trim() || null;
    if (dto.lessonName !== undefined) video.lessonName = dto.lessonName?.trim() || null;
    if (dto.contentOrder !== undefined) video.contentOrder = Number.isFinite(Number(dto.contentOrder)) ? Number(dto.contentOrder) : 0;
    if (dto.unlockRule !== undefined) video.unlockRule = dto.unlockRule || UnlockRuleType.NONE;
    if (dto.unlockAssignmentId !== undefined) video.unlockAssignmentId = dto.unlockAssignmentId || null;
    if (dto.unlockScore !== undefined) video.unlockScore = dto.unlockScore ?? null;
    if (dto.unlockVideoId !== undefined) video.unlockVideoId = dto.unlockVideoId || null;
    if (dto.unlockPercent !== undefined) video.unlockPercent = dto.unlockPercent ?? null;
    if (dto.prerequisites !== undefined) {
      video.prerequisites = Array.isArray(dto.prerequisites) && dto.prerequisites.length > 0 ? dto.prerequisites : null;
    }
    if (dto.attachments !== undefined) {
      video.attachments = Array.isArray(dto.attachments) ? dto.attachments : [];
    }
    if (dto.provider === 'document' || dto.provider === 'pdf') {
      video.provider = 'document';
      if (dto.sourceUrl) video.providerVideoId = dto.sourceUrl;
      video.youtubeVideoId = null;
    } else if (dto.sourceUrl) {
      if (video.provider === 'document') {
        video.providerVideoId = dto.sourceUrl;
      } else {
        const source = this.parseVideoSource(dto.sourceUrl, dto.provider);
        video.provider = source.provider;
        video.providerVideoId = source.providerVideoId;
        video.youtubeVideoId = source.provider === 'youtube' ? source.providerVideoId : null;
      }
    }
    const saved = await this.videosRepo.save(video);
    await this.cache.bumpVersion(courseContentVersionKey(video.courseName, video.groupName));
    return saved;
  }

  async remove(id: string, actor: User) {
    const video = await this.videosRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    const scope = await resolveStaffScope(this.usersRepo, actor);
    if (!canManageOwnedWork(scope, actor, video.teacherId)) {
      throw new ForbiddenException('You can only delete your own videos');
    }
    await this.videosRepo.delete(id);
    await this.cache.bumpVersion(courseContentVersionKey(video.courseName, video.groupName));
    return { message: 'Video deleted' };
  }

  private async getOwnedVideo(videoId: string, actor: User) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    const scope = await resolveStaffScope(this.usersRepo, actor);
    if (!canManageOwnedWork(scope, actor, video.teacherId)) {
      throw new ForbiddenException('You can only manage your own videos');
    }
    return video;
  }

  private async withCheckpointSummary(video: CourseVideo) {
    const checkpoints = await this.checkpointsRepo.find({ where: { videoId: video.id }, order: { orderIndex: 'ASC', timestampSeconds: 'ASC' } });
    return { ...this.publicVideo(video), checkpoints };
  }

  private generateSignedBunnyUrl(providerVideoId: string | null): string | null {
    if (!providerVideoId) return null;
    let cleanId = providerVideoId.trim();
    if (cleanId.includes('iframe.mediadelivery.net/embed/')) {
      cleanId = cleanId.split('iframe.mediadelivery.net/embed/')[1].split('?')[0];
    }
    const parts = cleanId.split('/').filter(Boolean);
    if (parts.length < 2) return `https://iframe.mediadelivery.net/embed/${cleanId}`;

    const libraryId = parts[0];
    const videoId = parts[1];
    const securityKey = process.env.BUNNY_STREAM_SECURITY_KEY || process.env.BUNNY_SECURITY_KEY;

    if (!securityKey) {
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
    }

    // Bunny Token Authentication: SHA256(securityKey + videoId + expires)
    const expires = Math.floor(Date.now() / 1000) + 7200; // valid for 2 hours
    const hashable = securityKey + videoId + expires;
    const token = crypto.createHash('sha256').update(hashable).digest('hex');

    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
  }

  private publicVideo(video: CourseVideo) {
    const isBunny = video.provider === 'bunny';
    return {
      id: video.id,
      courseName: video.courseName,
      groupName: video.groupName,
      title: video.title,
      description: video.description,
      chapterName: video.chapterName,
      lessonName: video.lessonName,
      contentOrder: video.contentOrder,
      unlockRule: video.unlockRule,
      unlockAssignmentId: video.unlockAssignmentId,
      unlockScore: video.unlockScore,
      unlockVideoId: video.unlockVideoId,
      unlockPercent: video.unlockPercent,
      prerequisites: video.prerequisites || null,
      provider: video.provider || 'youtube',
      providerVideoId: video.providerVideoId || video.youtubeVideoId,
      embedUrl: isBunny ? this.generateSignedBunnyUrl(video.providerVideoId) : null,
      attachments: video.attachments || [],
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    };
  }

  private evaluateSingleConditionWithLookup(
    rule: string,
    prerequisiteId: string | null | undefined,
    requiredScore: number | null | undefined,
    prerequisiteVideoId: string | null | undefined,
    requiredPercent: number | null | undefined,
    progressMap: Map<string, VideoProgress>,
    submissionMap: Map<string, AssignmentSubmission>,
    assignmentMap: Map<string, Assignment>,
  ): { isLocked: boolean; lockReason: string | null } {
    if (!rule || rule === UnlockRuleType.NONE) return { isLocked: false, lockReason: null };
    if (rule === UnlockRuleType.WATCH_VIDEO) {
      if (!prerequisiteVideoId) return { isLocked: false, lockReason: null };
      const progress = progressMap.get(prerequisiteVideoId);
      const threshold = requiredPercent != null ? requiredPercent : 100;
      if (!progress || progress.watchedPercent < threshold) {
        return { isLocked: true, lockReason: `Watch at least ${threshold}% of the previous video` };
      }
      return { isLocked: false, lockReason: null };
    }
    if (!prerequisiteId) return { isLocked: false, lockReason: null };
    const submission = submissionMap.get(prerequisiteId);
    if (!submission) {
      return { isLocked: true, lockReason: rule === UnlockRuleType.PASS_QUIZ ? 'Complete the previous quiz first' : 'Submit the previous assignment first' };
    }
    const prerequisite = assignmentMap.get(prerequisiteId);
    const percentage = submission.grade === null || submission.grade === undefined
      ? 0
      : (submission.grade / Math.max(prerequisite?.maxGrade ?? 100, 1)) * 100;
    if (rule === UnlockRuleType.PASS_QUIZ && (submission.grade === null || submission.grade === undefined || percentage < (requiredScore ?? 50))) {
      return { isLocked: true, lockReason: `You need at least ${requiredScore ?? 50}% in the previous quiz` };
    }
    return { isLocked: false, lockReason: null };
  }

  private getUnlockStateWithLookup(
    rule: UnlockRuleType,
    prerequisiteId: string | null,
    requiredScore: number | null,
    prerequisiteVideoId: string | null,
    requiredPercent: number | null,
    prerequisites: Array<{ unlockRule: string; unlockVideoId?: string | null; unlockPercent?: number | null; unlockAssignmentId?: string | null; unlockScore?: number | null }> | null | undefined,
    progressMap: Map<string, VideoProgress>,
    submissionMap: Map<string, AssignmentSubmission>,
    assignmentMap: Map<string, Assignment>,
  ) {
    if (prerequisites && prerequisites.length > 0) {
      for (const p of prerequisites) {
        const result = this.evaluateSingleConditionWithLookup(
          p.unlockRule,
          p.unlockAssignmentId,
          p.unlockScore,
          p.unlockVideoId,
          p.unlockPercent,
          progressMap,
          submissionMap,
          assignmentMap,
        );
        if (result.isLocked) return result;
      }
      return { isLocked: false, lockReason: null };
    }
    return this.evaluateSingleConditionWithLookup(
      rule,
      prerequisiteId,
      requiredScore,
      prerequisiteVideoId,
      requiredPercent,
      progressMap,
      submissionMap,
      assignmentMap,
    );
  }

  private async evaluateSingleCondition(
    rule: string,
    prerequisiteId: string | null | undefined,
    requiredScore: number | null | undefined,
    prerequisiteVideoId: string | null | undefined,
    requiredPercent: number | null | undefined,
    studentId: string,
  ): Promise<{ isLocked: boolean; lockReason: string | null }> {
    if (!rule || rule === UnlockRuleType.NONE) return { isLocked: false, lockReason: null };
    if (rule === UnlockRuleType.WATCH_VIDEO) {
      if (!prerequisiteVideoId) return { isLocked: false, lockReason: null };
      const progress = await this.progressRepo.findOne({ where: { videoId: prerequisiteVideoId, studentId } });
      const threshold = requiredPercent != null ? requiredPercent : 100;
      if (!progress || progress.watchedPercent < threshold) {
        return { isLocked: true, lockReason: `Watch at least ${threshold}% of the previous video` };
      }
      return { isLocked: false, lockReason: null };
    }
    if (!prerequisiteId) return { isLocked: false, lockReason: null };
    const submission = await this.submissionsRepo.findOne({ where: { assignmentId: prerequisiteId, studentId } });
    if (!submission) {
      return { isLocked: true, lockReason: rule === UnlockRuleType.PASS_QUIZ ? 'Complete the previous quiz first' : 'Submit the previous assignment first' };
    }
    const prerequisite = await this.assignmentsRepo.findOne({ where: { id: prerequisiteId } });
    const percentage = submission.grade === null || submission.grade === undefined
      ? 0
      : (submission.grade / Math.max(prerequisite?.maxGrade ?? 100, 1)) * 100;
    if (rule === UnlockRuleType.PASS_QUIZ && (submission.grade === null || submission.grade === undefined || percentage < (requiredScore ?? 50))) {
      return { isLocked: true, lockReason: `You need at least ${requiredScore ?? 50}% in the previous quiz` };
    }
    return { isLocked: false, lockReason: null };
  }

  private async getUnlockState(
    rule: UnlockRuleType,
    prerequisiteId: string | null,
    requiredScore: number | null,
    prerequisiteVideoId: string | null,
    requiredPercent: number | null,
    studentId: string,
    prerequisites?: Array<{ unlockRule: string; unlockVideoId?: string | null; unlockPercent?: number | null; unlockAssignmentId?: string | null; unlockScore?: number | null }> | null,
  ) {
    // Multi-prerequisite mode: evaluate ALL conditions (AND logic)
    if (prerequisites && prerequisites.length > 0) {
      for (const p of prerequisites) {
        const result = await this.evaluateSingleCondition(
          p.unlockRule, p.unlockAssignmentId, p.unlockScore, p.unlockVideoId, p.unlockPercent, studentId,
        );
        if (result.isLocked) return result;
      }
      return { isLocked: false, lockReason: null };
    }
    // Legacy single-condition fallback
    return this.evaluateSingleCondition(rule, prerequisiteId, requiredScore, prerequisiteVideoId, requiredPercent, studentId);
  }

  private async getStudentEnrollments(
    courseName: string,
    groupName: string,
    studentId: string,
  ): Promise<CourseEnrollment[]> {
    const enrollments = await this.enrollmentsRepo.find({
      where: { courseName, groupName, studentId },
      order: { createdAt: 'DESC' },
    });
    if (!enrollments.length) throw new ForbiddenException('You are not enrolled in this course group');
    const active = enrollments.filter(e => !isEnrollmentExpired(e));
    if (!active.length) throw new ForbiddenException('This course access has expired');
    return active;
  }

  private async assertEnrollment(
    courseName: string,
    groupName: string,
    studentId: string,
    chapterName?: string | null,
    lessonName?: string | null,
  ): Promise<CourseEnrollment> {
    const enrollments = await this.getStudentEnrollments(courseName, groupName, studentId);
    if (chapterName !== undefined || lessonName !== undefined) {
      assertCourseContentAccessAcrossEnrollments(enrollments, chapterName, lessonName);
    }
    return enrollments.find(e => e.codeType === CodeType.TIMED) || enrollments[0];
  }

  private validateCheckpoint(dto: CheckpointDto, current?: VideoCheckpoint) {
    const timestampSeconds = Number(dto.timestampSeconds ?? current?.timestampSeconds);
    const prompt = (dto.prompt ?? current?.prompt ?? '').trim();
    const type = (dto.type ?? current?.type ?? VideoCheckpointType.MCQ) as VideoCheckpointType;
    if (!Number.isFinite(timestampSeconds) || timestampSeconds < 0) throw new BadRequestException('A valid timestamp is required');
    if (!prompt) throw new BadRequestException('Question text is required');
    if (![VideoCheckpointType.MCQ, VideoCheckpointType.ESSAY].includes(type)) {
      throw new BadRequestException('Question type must be MCQ or ESSAY');
    }

    const options = Array.isArray(dto.options)
      ? dto.options.map((option, index) => ({
          id: String(option.id || String.fromCharCode(65 + index)).trim(),
          text: String(option.text || '').trim(),
        })).filter(option => option.text)
      : (current?.options || []);
    const correctAnswer = (dto.correctAnswer ?? current?.correctAnswer ?? '').trim() || null;
    if (type === VideoCheckpointType.MCQ) {
      if (options.length < 2) throw new BadRequestException('MCQ requires at least two options');
      if (!correctAnswer || !options.some(option => option.id === correctAnswer)) {
        throw new BadRequestException('Choose a correct MCQ option');
      }
    }

    return {
      timestampSeconds: Math.floor(timestampSeconds),
      prompt,
      type,
      options: type === VideoCheckpointType.MCQ ? options : [],
      correctAnswer: type === VideoCheckpointType.MCQ ? correctAnswer : null,
      solutionText: (dto.solutionText ?? current?.solutionText ?? '').trim() || null,
      solutionUrl: (dto.solutionUrl ?? current?.solutionUrl ?? '').trim() || null,
      requireSolutionUpload: Boolean(dto.requireSolutionUpload ?? current?.requireSolutionUpload),
      showSolutionAfterAnswer: dto.showSolutionAfterAnswer ?? current?.showSolutionAfterAnswer ?? true,
    };
  }

  private parseVideoSource(value: string | undefined, requestedProvider?: string): ParsedSource {
    if (!value?.trim()) throw new BadRequestException('A video link is required');
    const raw = value.trim();
    const providerHint = requestedProvider?.toLowerCase();
    let isHlsPlaylist = false;
    try {
      isHlsPlaylist = /\.m3u8$/i.test(new URL(raw).pathname);
    } catch {
      // Non-URL provider embed codes are parsed by their provider-specific handlers below.
    }

    if (providerHint === 'hls' || isHlsPlaylist) {
      let hlsUrl: URL;
      try { hlsUrl = new URL(raw); } catch { throw new BadRequestException('Enter a valid HTTPS HLS playlist URL'); }
      if (
        hlsUrl.protocol !== 'https:'
        || hlsUrl.username
        || hlsUrl.password
        || hlsUrl.href.length > 2048
        || !/\.m3u8$/i.test(hlsUrl.pathname)
      ) {
        throw new BadRequestException('HLS videos must use a direct HTTPS .m3u8 playlist URL');
      }
      return { provider: 'hls', providerVideoId: hlsUrl.href };
    }

    // Wistia supplies several embed formats (iframe, script, and
    // wistia_async_* divs). Store only the media id; never persist raw HTML.
    const wistiaEmbedId = raw.match(/(?:wistia_async_|data-wistia-id=["']|\/(?:medias|iframe)\/|\/embed\/(?:medias\/|iframe\/)?)([A-Za-z0-9_-]+)/i)?.[1];
    if (wistiaEmbedId && (providerHint === 'wistia' || /wistia/i.test(raw))) {
      return { provider: 'wistia', providerVideoId: wistiaEmbedId };
    }

    const urlText = raw.match(/https?:\/\/[^\s"'<>]+/i)?.[0]?.replace(/[),;]+$/, '') || raw;
    let url: URL;
    try { url = new URL(urlText); } catch { throw new BadRequestException('Enter a valid video link or embed code'); }

    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let provider: ParsedSource['provider'] | null = null;
    let providerVideoId: string | null = null;

    if (host === 'youtu.be' || host.endsWith('youtube.com')) {
      provider = 'youtube';
      providerVideoId = host === 'youtu.be'
        ? url.pathname.split('/').filter(Boolean)[0] || null
        : url.searchParams.get('v') || (url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null);
    } else if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      provider = 'vimeo';
      providerVideoId = url.pathname.match(/(?:video\/)?([0-9]+)/)?.[1] || null;
    } else if (host.endsWith('wistia.com') || host === 'fast.wistia.net') {
      provider = 'wistia';
      providerVideoId = url.pathname.match(/\/(?:medias|iframe)\/([^/?#.]+)/)?.[1]
        || url.pathname.match(/\/embed\/(?:medias\/|iframe\/)?([^/?#.]+)/)?.[1]
        || null;
    } else if (host === 'iframe.mediadelivery.net' || host === 'player.mediadelivery.net' || host.endsWith('bunnycdn.com')) {
      provider = 'bunny';
      const parts = url.pathname.split('/').filter(Boolean);
      const embedIndex = parts.indexOf('embed');
      const playIndex = parts.indexOf('play');
      if (embedIndex >= 0 && parts[embedIndex + 2]) {
        providerVideoId = parts[embedIndex + 1] + '/' + parts[embedIndex + 2];
      } else if (playIndex >= 0 && parts[playIndex + 2]) {
        providerVideoId = parts[playIndex + 1] + '/' + parts[playIndex + 2];
      }
    }

    if (!provider || !providerVideoId || (providerHint && providerHint !== provider)) {
      throw new BadRequestException('Use a valid YouTube, Vimeo, Wistia, Bunny Stream, or HLS link');
    }
    if (provider === 'youtube' && !/^[A-Za-z0-9_-]{11}$/.test(providerVideoId)) {
      throw new BadRequestException('Enter a valid YouTube video link');
    }
    if (provider === 'bunny' && !/^[^/]+\/[^/]+$/.test(providerVideoId)) {
      throw new BadRequestException('Bunny Stream links must include library and video ids');
    }
    return { provider, providerVideoId };
  }
}
