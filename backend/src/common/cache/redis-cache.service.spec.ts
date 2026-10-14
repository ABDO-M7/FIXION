import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';
import { studentCourseCacheKey } from './course-cache-keys';

describe('RedisCacheService', () => {
  function createCache() {
    const cache = new RedisCacheService({ get: () => undefined } as unknown as ConfigService);
    const values = new Map<string, string>();
    const client = {
      status: 'ready',
      get: jest.fn(async (key: string) => values.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
        return 'OK';
      }),
      incr: jest.fn(async (key: string) => {
        const next = Number(values.get(key) || 0) + 1;
        values.set(key, String(next));
        return next;
      }),
      del: jest.fn(async (key: string) => values.delete(key)),
    };
    Object.defineProperty(cache, 'client', { value: client });
    return { cache, client };
  }

  it('serves a scoped cached value until its version changes', async () => {
    const { cache, client } = createCache();
    const loader = jest.fn().mockResolvedValue([{ id: 'assignment-1' }]);
    const key = studentCourseCacheKey('assignments', 'Physics', 'Online Senior 2', 'student-1');

    await expect(cache.remember(key, 15, ['content-version', 'student-version'], loader))
      .resolves.toEqual([{ id: 'assignment-1' }]);
    await expect(cache.remember(key, 15, ['content-version', 'student-version'], loader))
      .resolves.toEqual([{ id: 'assignment-1' }]);
    expect(loader).toHaveBeenCalledTimes(1);

    await cache.bumpVersion('student-version');
    await cache.remember(key, 15, ['content-version', 'student-version'], loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(client.set).toHaveBeenCalledTimes(2);
  });

  it('keeps student cache keys isolated', () => {
    expect(studentCourseCacheKey('videos', 'Physics', 'Group 1', 'student-1'))
      .not.toBe(studentCourseCacheKey('videos', 'Physics', 'Group 1', 'student-2'));
  });
});
