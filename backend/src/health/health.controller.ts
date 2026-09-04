import { Controller, Get, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import { NotificationsGateway } from '../modules/notifications/notifications.gateway';

@Controller('health')
export class HealthController {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
    private notificationsGateway: NotificationsGateway,
  ) {
    const accountId = configService.get<string>('r2.accountId') ?? '';
    const accessKeyId = configService.get<string>('r2.accessKeyId') ?? '';
    const secretAccessKey = configService.get<string>('r2.secretAccessKey') ?? '';
    this.bucket = configService.get<string>('r2.bucketName') ?? 'fixion-uploads';

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /** Basic health check (public) */
  @Get()
  check() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    };
  }

  /** Detailed health with all service checks (admin use) */
  @Get('detailed')
  async detailed() {
    const checks: Record<string, any> = {};
    let overallStatus = 'healthy';

    // ── 1. Neon PostgreSQL ──────────────────────
    try {
      const dbStart = Date.now();
      await this.dataSource.query('SELECT 1');
      const dbLatency = Date.now() - dbStart;

      // Get database size
      const [dbSizeResult] = await this.dataSource.query(
        `SELECT pg_database_size(current_database()) as size`,
      );
      const dbSizeBytes = parseInt(dbSizeResult.size, 10);

      // Get table counts
      const tableStats = await this.dataSource.query(`
        SELECT relname as table_name, 
               n_live_tup as row_count
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC
      `);

      // Get active connections
      const [connResult] = await this.dataSource.query(
        `SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`,
      );

      checks.database = {
        status: 'up',
        latency: `${dbLatency}ms`,
        provider: 'Neon PostgreSQL',
        size: this.formatBytes(dbSizeBytes),
        sizeBytes: dbSizeBytes,
        // Neon free tier = 0.5 GB, pro = 10 GB
        maxSize: '0.5 GB (Free Tier)',
        maxSizeBytes: 0.5 * 1024 * 1024 * 1024,
        usagePercent: Math.round((dbSizeBytes / (0.5 * 1024 * 1024 * 1024)) * 100),
        activeConnections: parseInt(connResult.count, 10),
        tables: tableStats.map((t: any) => ({
          name: t.table_name,
          rows: parseInt(t.row_count, 10),
        })),
      };
    } catch (err: any) {
      checks.database = {
        status: 'down',
        error: err.message,
        provider: 'Neon PostgreSQL',
      };
      overallStatus = 'unhealthy';
    }

    // ── 2. Cloudflare R2 Storage ────────────────
    try {
      const r2Start = Date.now();
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      const r2Latency = Date.now() - r2Start;

      // List objects to estimate storage usage
      let totalSize = 0;
      let objectCount = 0;
      let continuationToken: string | undefined;

      // Iterate through all objects (may take a bit on large buckets)
      do {
        const listResult = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            ContinuationToken: continuationToken,
            MaxKeys: 1000,
          }),
        );

        if (listResult.Contents) {
          for (const obj of listResult.Contents) {
            totalSize += obj.Size || 0;
            objectCount++;
          }
        }

        continuationToken = listResult.IsTruncated
          ? listResult.NextContinuationToken
          : undefined;
      } while (continuationToken);

      checks.storage = {
        status: 'up',
        latency: `${r2Latency}ms`,
        provider: 'Cloudflare R2',
        bucket: this.bucket,
        objectCount,
        size: this.formatBytes(totalSize),
        sizeBytes: totalSize,
        // R2 free tier = 10 GB
        maxSize: '10 GB (Free Tier)',
        maxSizeBytes: 10 * 1024 * 1024 * 1024,
        usagePercent: Math.round((totalSize / (10 * 1024 * 1024 * 1024)) * 100),
        publicUrl: this.configService.get<string>('r2.publicUrl') || 'Not configured',
      };
    } catch (err: any) {
      checks.storage = {
        status: 'down',
        error: err.message,
        provider: 'Cloudflare R2',
        bucket: this.bucket,
      };
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // ── 3. Resend Email ─────────────────────────
    const resendKey = this.configService.get<string>('resend.apiKey');
    const resendFrom = this.configService.get<string>('resend.fromEmail');
    checks.email = {
      status: resendKey ? 'up' : 'not_configured',
      provider: 'Resend',
      configured: !!resendKey,
      fromEmail: resendFrom || 'Not set',
    };
    if (!resendKey) {
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // ── 4. Google OAuth ─────────────────────────
    const googleId = this.configService.get<string>('google.clientId');
    const googleSecret = this.configService.get<string>('google.clientSecret');
    checks.oauth = {
      status: googleId && googleSecret ? 'up' : 'not_configured',
      provider: 'Google OAuth',
      configured: !!(googleId && googleSecret),
      callbackUrl: this.configService.get<string>('google.callbackUrl') || 'Not set',
    };

    // ── 5. WebSocket ────────────────────────────
    try {
      const server = this.notificationsGateway.server;
      const sockets = server ? await server.fetchSockets() : [];
      checks.websocket = {
        status: 'up',
        provider: 'Socket.IO',
        namespace: '/notifications',
        connections: sockets.length,
      };
    } catch {
      checks.websocket = {
        status: 'unknown',
        provider: 'Socket.IO',
        connections: 0,
      };
    }

    // ── 6. Server Info ──────────────────────────
    const memUsage = process.memoryUsage();
    const server = {
      nodeVersion: process.version,
      environment: this.configService.get<string>('app.nodeEnv') || 'unknown',
      uptime: Math.round(process.uptime()),
      uptimeFormatted: this.formatUptime(process.uptime()),
      memory: {
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        rss: this.formatBytes(memUsage.rss),
        external: this.formatBytes(memUsage.external),
        heapUsedBytes: memUsage.heapUsed,
        heapTotalBytes: memUsage.heapTotal,
        rssBytes: memUsage.rss,
      },
      pid: process.pid,
      platform: process.platform,
    };

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      server,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  }
}
