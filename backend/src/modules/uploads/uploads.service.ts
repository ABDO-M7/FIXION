import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = configService.get<string>('r2.accountId') ?? '';
    this.bucket = configService.get<string>('r2.bucketName') ?? 'fixion-uploads';
    this.publicUrl = configService.get<string>('r2.publicUrl') ?? '';

    const accessKeyId = configService.get<string>('r2.accessKeyId') ?? '';
    const secretAccessKey = configService.get<string>('r2.secretAccessKey') ?? '';

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async uploadFile(
    file: MulterFile,
    folder: string = 'uploads',
  ): Promise<{ url: string; key: string }> {
    if (!this.bucket || !this.publicUrl) {
      throw new BadRequestException(
        'File storage (R2) is not configured. Set R2_* environment variables to enable uploads.',
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed: images, PDF, Word documents.`,
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File size must not exceed 10MB');
    }

    const ext = file.originalname.split('.').pop();
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      }),
    );

    return { url: `${this.publicUrl}/${key}`, key };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
