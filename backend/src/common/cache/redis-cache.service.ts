import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis | null;
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private lastRedisErrorLogAt = 0;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    this.client = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: attempts => Math.min(attempts * 250, 2000),
        })
      : null;

    this.client?.on('error', error => {
      if (Date.now() - this.lastRedisErrorLogAt < 30_000) return;
      this.lastRedisErrorLogAt = Date.now();
      this.logger.error(`Redis cache connection error; requests will continue without cache: ${error.message}`);
    });
  }

  onModuleInit(): void {
    if (!this.client) {
      this.logger.warn('REDIS_URL is not configured; shared response caching is disabled');
      return;
    }

    void this.client.connect().catch(error => {
      this.logger.error(`Redis cache could not connect; requests will continue without cache: ${error.message}`);
    });
  }

  getStatus(): 'disabled' | 'connecting' | 'ready' | 'unavailable' {
    if (!this.client) return 'disabled';
    if (this.client.status === 'ready') return 'ready';
    if (this.client.status === 'connecting' || this.client.status === 'reconnecting') return 'connecting';
    return 'unavailable';
  }

  async remember<T>(
    key: string,
    ttlSeconds: number,
    versionKeys: string[],
    loader: () => Promise<T>,
  ): Promise<T> {
    const client = this.client;
    if (!client || client.status !== 'ready') return loader();

    const versions = await Promise.all(versionKeys.map(versionKey => this.getVersion(versionKey)));
    const versionedKey = `${key}:v${versions.join('.')}`;

    try {
      const cached = await client.get(versionedKey);
      if (cached !== null) {
        try {
          return JSON.parse(cached) as T;
        } catch (error) {
          this.logRedisError('Could not decode a cached response', error);
          await client.del(versionedKey).catch(deleteError => this.logRedisError('Could not remove invalid cache entry', deleteError));
        }
      }
    } catch (error) {
      this.logRedisError('Could not read cache entry', error);
      return loader();
    }

    const pending = this.inFlight.get(versionedKey) as Promise<T> | undefined;
    if (pending) return pending;

    const loadPromise = loader()
      .then(async value => {
        try {
          await client.set(versionedKey, JSON.stringify(value), 'EX', ttlSeconds);
        } catch (error) {
          this.logRedisError('Could not write cache entry', error);
        }
        return value;
      })
      .finally(() => this.inFlight.delete(versionedKey));
    this.inFlight.set(versionedKey, loadPromise);
    return loadPromise;
  }

  async bumpVersion(key: string): Promise<void> {
    if (!this.client || this.client.status !== 'ready') return;
    try {
      await this.client.incr(key);
    } catch (error) {
      this.logRedisError('Could not invalidate cached data', error);
    }
  }

  private async getVersion(key: string): Promise<string> {
    if (!this.client || this.client.status !== 'ready') return '0';
    try {
      return (await this.client.get(key)) ?? '0';
    } catch (error) {
      this.logRedisError('Could not read cache version', error);
      return '0';
    }
  }

  private logRedisError(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    if (Date.now() - this.lastRedisErrorLogAt < 30_000) return;
    this.lastRedisErrorLogAt = Date.now();
    this.logger.error(`${operation}; requests will continue without cache: ${message}`);
  }
}
