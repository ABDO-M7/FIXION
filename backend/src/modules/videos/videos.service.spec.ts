import { BadRequestException } from '@nestjs/common';
import { VideosService } from './videos.service';
import { CodeType } from '../subscriptions/entities/subscription-code.entity';
import { UnlockRuleType } from '../learning/unlock-rule';

describe('VideosService HLS source validation', () => {
  const parseVideoSource = (url: string, provider = 'hls') =>
    (VideosService.prototype as any).parseVideoSource.call({}, url, provider);

  it('accepts direct HTTPS Bunny CDN HLS playlists', () => {
    const source = parseVideoSource('https://vz-example.b-cdn.net/video-guid/playlist.m3u8?token=abc');

    expect(source).toEqual({
      provider: 'hls',
      providerVideoId: 'https://vz-example.b-cdn.net/video-guid/playlist.m3u8?token=abc',
    });
  });

  it('accepts signed playlist URLs longer than the old provider id column', () => {
    const url = `https://vz-example.b-cdn.net/video-guid/playlist.m3u8?token=${'a'.repeat(300)}`;

    expect(parseVideoSource(url).providerVideoId).toBe(url);
  });

  it.each([
    'http://cdn.example.com/video/playlist.m3u8',
    'https://cdn.example.com/video/playlist.mp4',
    'https://user:password@cdn.example.com/video/playlist.m3u8',
    'javascript:alert(1)',
    `https://cdn.example.com/video/playlist.m3u8?token=${'a'.repeat(2050)}`,
  ])('rejects unsafe or non-HLS source %s', url => {
    expect(() => parseVideoSource(url)).toThrow(BadRequestException);
  });

  it('recognizes a direct HLS playlist even when the form still says Bunny Stream', () => {
    expect(parseVideoSource('https://cdn.example.com/video/playlist.m3u8', 'bunny')).toEqual({
      provider: 'hls',
      providerVideoId: 'https://cdn.example.com/video/playlist.m3u8',
    });
  });
});

describe('VideosService.listForStudent batching (no N+1)', () => {
  it('batches checkpoint, progress, response, and prerequisite queries across multiple videos', async () => {
    const enrollmentsRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'enr-1',
          courseName: 'Physics',
          groupName: 'G1',
          studentId: 'student-1',
          codeType: CodeType.TIMED,
          expiresAt: new Date(Date.now() + 86400_000),
        },
      ]),
    };
    const videosRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'vid-1',
          courseName: 'Physics',
          groupName: 'G1',
          title: 'Lesson 1',
          chapterName: 'Ch 1',
          lessonName: 'L1',
          unlockRule: UnlockRuleType.NONE,
          provider: 'youtube',
          providerVideoId: 'dQw4w9WgXcQ',
          attachments: [],
          teacherId: 'teacher-1',
        },
        {
          id: 'vid-2',
          courseName: 'Physics',
          groupName: 'G1',
          title: 'Lesson 2',
          chapterName: 'Ch 1',
          lessonName: 'L2',
          unlockRule: UnlockRuleType.WATCH_VIDEO,
          unlockVideoId: 'vid-1',
          unlockPercent: 80,
          provider: 'youtube',
          providerVideoId: 'dQw4w9WgXcQ',
          attachments: [],
          teacherId: 'teacher-1',
        },
      ]),
    };
    const checkpointsRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'cp-1', videoId: 'vid-1', orderIndex: 0, timestampSeconds: 10 },
      ]),
    };
    const responsesRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'resp-1', videoId: 'vid-1', checkpointId: 'cp-1', studentId: 'student-1', isCorrect: true },
      ]),
    };
    const progressRepo = {
      find: jest.fn().mockResolvedValue([
        { videoId: 'vid-1', studentId: 'student-1', watchedPercent: 50, opened: false, openedAttachments: [] },
      ]),
      findOne: jest.fn(),
    };
    const submissionsRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    const assignmentsRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    const cache = {
      remember: jest.fn((_k, _ttl, _v, factory) => factory()),
    };

    const service = new VideosService(
      videosRepo as any,
      enrollmentsRepo as any,
      checkpointsRepo as any,
      responsesRepo as any,
      {} as any,
      assignmentsRepo as any,
      {} as any,
      submissionsRepo as any,
      progressRepo as any,
      cache as any,
    );

    const result = await service.listForStudent('Physics', 'G1', 'student-1');

    expect(checkpointsRepo.find).toHaveBeenCalledTimes(1);
    expect(responsesRepo.find).toHaveBeenCalledTimes(1);
    expect(progressRepo.find).toHaveBeenCalledTimes(1);
    expect(progressRepo.findOne).not.toHaveBeenCalled();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'vid-1',
      watchedPercent: 50,
      isLocked: false,
      checkpointCount: 1,
      completedCheckpointCount: 1,
    });
    expect(result[1]).toMatchObject({
      id: 'vid-2',
      watchedPercent: 0,
      isLocked: true,
      lockReason: 'Watch at least 80% of the previous video',
    });
  });

  it('tracks watch percentage accurately from first ping and at 2x playback speed', async () => {
    const enrollmentsRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'enr-1',
          courseName: 'Physics',
          groupName: 'G1',
          studentId: 'student-1',
          codeType: CodeType.TIMED,
          expiresAt: new Date(Date.now() + 86400_000),
        },
      ]),
    };
    const videosRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'vid-1',
        courseName: 'Physics',
        groupName: 'G1',
        chapterName: 'Ch 1',
        lessonName: 'L1',
      }),
    };
    let storedProgress: any = null;
    const progressRepo = {
      findOne: jest.fn().mockImplementation(async () => storedProgress),
      create: jest.fn().mockImplementation(data => ({ ...data })),
      save: jest.fn().mockImplementation(async data => {
        storedProgress = { ...data, updatedAt: new Date(Date.now() - 4000) };
        return storedProgress;
      }),
    };
    const cache = { bumpVersion: jest.fn() };

    const service = new VideosService(
      videosRepo as any,
      enrollmentsRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      progressRepo as any,
      cache as any,
    );

    // 1st ping at 8 seconds into a 40-second video (should record [0, 8] = 20%)
    const first = await service.updateProgress('vid-1', 'student-1', {
      watchedSeconds: 8,
      durationSeconds: 40,
    });
    expect(first.opened).toBe(true);
    expect(first.watchedSeconds).toBe(8);
    expect(first.watchedPercent).toBe(20);

    // 2nd ping at 16s after 4s wall-clock elapsed (2x speed: 8s advance in 4s) -> [0, 16] = 40%
    const second = await service.updateProgress('vid-1', 'student-1', {
      watchedSeconds: 16,
      durationSeconds: 40,
    });
    expect(second.watchedSeconds).toBe(16);
    expect(second.watchedPercent).toBe(40);

    // 3rd ping at 39.2s after 10s elapsed -> snaps near-completion to 100%
    storedProgress.updatedAt = new Date(Date.now() - 10_000);
    const third = await service.updateProgress('vid-1', 'student-1', {
      watchedSeconds: 39.2,
      durationSeconds: 40,
    });
    expect(third.watchedPercent).toBe(100);
  });
});
