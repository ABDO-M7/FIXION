import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { User } from '../users/entities/user.entity';
import { CourseVideo } from './entities/course-video.entity';
import { VideoCheckpoint, VideoCheckpointOption, VideoCheckpointType } from './entities/video-checkpoint.entity';
import { VideoResponse } from './entities/video-response.entity';
import { canManageOwnedWork, resolveStaffScope, workOwnerId } from '../../common/staff-access';
import { Assignment } from '../assignments/entities/assignment.entity';
import { AssignmentSubmission } from '../assignments/entities/assignment-submission.entity';
import { UnlockRuleType } from '../learning/unlock-rule';
import { VideoProgress } from './entities/video-progress.entity';

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
  provider: 'youtube' | 'vimeo' | 'wistia' | 'bunny';
  providerVideoId: string;
};

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(CourseVideo) private readonly videosRepo: Repository<CourseVideo>,
    @InjectRepository(CourseEnrollment) private readonly enrollmentsRepo: Repository<CourseEnrollment>,
    @InjectRepository(VideoCheckpoint) private readonly checkpointsRepo: Repository<VideoCheckpoint>,
    @InjectRepository(VideoResponse) private readonly responsesRepo: Repository<VideoResponse>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Assignment) private readonly assignmentsRepo: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission) private readonly submissionsRepo: Repository<AssignmentSubmission>,
    @InjectRepository(VideoProgress) private readonly progressRepo: Repository<VideoProgress>,
  ) {}

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
    const source = this.parseVideoSource(dto.sourceUrl || dto.videoUrl || dto.youtubeUrl, dto.provider);
    return this.videosRepo.save(this.videosRepo.create({
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
      provider: source.provider,
      providerVideoId: source.providerVideoId,
      youtubeVideoId: source.provider === 'youtube' ? source.providerVideoId : null,
      teacherId: workOwnerId(scope, teacher),
    }));
  }

  async listForTeacher(courseName: string, groupName: string, actor: User) {
    const scope = await resolveStaffScope(this.usersRepo, actor);
    if (scope.type === 'subjects' && !scope.subjects.includes(courseName)) return [];
    const where: { courseName: string; groupName: string; teacherId?: string } = { courseName, groupName };
    if (scope.type === 'teacher') {
      if (!scope.teacherId) return [];
      where.teacherId = scope.teacherId;
    }
    const videos = await this.videosRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return Promise.all(videos.map(video => this.withCheckpointSummary(video)));
  }

  async listForStudent(courseName: string, groupName: string, studentId: string) {
    const enrollment = await this.enrollmentsRepo.findOne({ where: { courseName, groupName, studentId } });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this course group');
    const videos = await this.videosRepo.find({ where: { courseName, groupName }, order: { createdAt: 'DESC' } });
    return Promise.all(videos.map(async video => {
      const checkpoints = await this.checkpointsRepo.find({ where: { videoId: video.id }, order: { orderIndex: 'ASC', timestampSeconds: 'ASC' } });
      const responses = checkpoints.length ? await this.responsesRepo.find({ where: { videoId: video.id, studentId } }) : [];
      const progress = await this.progressRepo.findOne({ where: { videoId: video.id, studentId } });
      const unlock = await this.getUnlockState(video.unlockRule, video.unlockAssignmentId, video.unlockScore, video.unlockVideoId, video.unlockPercent, studentId);
      return {
        ...this.publicVideo(video),
        watchedPercent: progress?.watchedPercent || 0,
        ...unlock,
        checkpointCount: checkpoints.length,
        completedCheckpointCount: responses.filter(response => response.isCorrect).length,
      };
    }));
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
    return this.checkpointsRepo.save(this.checkpointsRepo.create({ videoId: video.id, ...input, orderIndex }));
  }

  async updateCheckpoint(videoId: string, checkpointId: string, dto: CheckpointDto, actor: User) {
    await this.getOwnedVideo(videoId, actor);
    const checkpoint = await this.checkpointsRepo.findOne({ where: { id: checkpointId, videoId } });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    Object.assign(checkpoint, this.validateCheckpoint(dto, checkpoint));
    if (dto.orderIndex !== undefined) checkpoint.orderIndex = dto.orderIndex;
    return this.checkpointsRepo.save(checkpoint);
  }

  async removeCheckpoint(videoId: string, checkpointId: string, actor: User) {
    await this.getOwnedVideo(videoId, actor);
    const checkpoint = await this.checkpointsRepo.findOne({ where: { id: checkpointId, videoId } });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    await this.checkpointsRepo.delete(checkpoint.id);
    return { message: 'Checkpoint deleted' };
  }

  async getStudentExperience(videoId: string, student: User) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    await this.assertEnrollment(video.courseName, video.groupName, student.id);
    const unlock = await this.getUnlockState(video.unlockRule, video.unlockAssignmentId, video.unlockScore, video.unlockVideoId, video.unlockPercent, student.id);
    if (unlock.isLocked) throw new ForbiddenException(unlock.lockReason);
    const checkpoints = await this.checkpointsRepo.find({
      where: { videoId },
      order: { orderIndex: 'ASC', timestampSeconds: 'ASC' },
    });
    const responses = checkpoints.length ? await this.responsesRepo.find({ where: { videoId, studentId: student.id } }) : [];
    const responseMap = new Map(responses.map(response => [response.checkpointId, response]));
    return {
      video: this.publicVideo(video),
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
    await this.assertEnrollment(video.courseName, video.groupName, studentId);
    const watchedSeconds = Math.max(0, Math.floor(Number(dto.watchedSeconds) || 0));
    const durationSeconds = Math.max(0, Math.floor(Number(dto.durationSeconds) || 0));
    const watchedPercent = durationSeconds > 0 ? Math.min(100, Math.floor((watchedSeconds / durationSeconds) * 100)) : 0;
    const existing = await this.progressRepo.findOne({ where: { videoId, studentId } });
    const progress = existing || this.progressRepo.create({ videoId, studentId, watchedSeconds: 0, durationSeconds: 0, watchedPercent: 0 });
    progress.watchedSeconds = Math.max(progress.watchedSeconds, watchedSeconds);
    progress.durationSeconds = Math.max(progress.durationSeconds, durationSeconds);
    progress.watchedPercent = Math.max(progress.watchedPercent, watchedPercent);
    return this.progressRepo.save(progress);
  }

  async answerCheckpoint(videoId: string, checkpointId: string, student: User, dto: AnswerDto) {
    const video = await this.videosRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    await this.assertEnrollment(video.courseName, video.groupName, student.id);
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

  async remove(id: string, actor: User) {
    const video = await this.videosRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    const scope = await resolveStaffScope(this.usersRepo, actor);
    if (!canManageOwnedWork(scope, actor, video.teacherId)) {
      throw new ForbiddenException('You can only delete your own videos');
    }
    await this.videosRepo.delete(id);
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

  private publicVideo(video: CourseVideo) {
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
      provider: video.provider || 'youtube',
      providerVideoId: video.providerVideoId || video.youtubeVideoId,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    };
  }

  private async getUnlockState(rule: UnlockRuleType, prerequisiteId: string | null, requiredScore: number | null, prerequisiteVideoId: string | null, requiredPercent: number | null, studentId: string) {
    if (!rule || rule === UnlockRuleType.NONE) return { isLocked: false, lockReason: null };
    if (rule === UnlockRuleType.WATCH_VIDEO) {
      if (!prerequisiteVideoId) return { isLocked: false, lockReason: null };
      const progress = await this.progressRepo.findOne({ where: { videoId: prerequisiteVideoId, studentId } });
      if (!progress || progress.watchedPercent < (requiredPercent ?? 80)) {
        return { isLocked: true, lockReason: `Watch at least ${requiredPercent ?? 80}% of the previous video` };
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

  private async assertEnrollment(courseName: string, groupName: string, studentId: string) {
    const enrollment = await this.enrollmentsRepo.findOne({ where: { courseName, groupName, studentId } });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this course group');
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
      throw new BadRequestException('Use a valid YouTube, Vimeo, Wistia, or Bunny Stream link');
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
