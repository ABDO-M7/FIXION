"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
let UploadsService = class UploadsService {
    configService;
    s3;
    bucket;
    publicUrl;
    constructor(configService) {
        this.configService = configService;
        const accountId = configService.get('r2.accountId') ?? '';
        this.bucket = configService.get('r2.bucketName') ?? 'fixion-uploads';
        this.publicUrl = configService.get('r2.publicUrl') ?? '';
        const accessKeyId = configService.get('r2.accessKeyId') ?? '';
        const secretAccessKey = configService.get('r2.secretAccessKey') ?? '';
        this.s3 = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        });
    }
    async uploadFile(file, folder = 'uploads') {
        if (!this.bucket || !this.publicUrl) {
            throw new common_1.BadRequestException('File storage (R2) is not configured. Set R2_* environment variables to enable uploads.');
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`File type ${file.mimetype} is not allowed. Allowed: images, PDF, Word documents.`);
        }
        if (file.size > MAX_SIZE_BYTES) {
            throw new common_1.BadRequestException('File size must not exceed 10MB');
        }
        const ext = file.originalname.split('.').pop();
        const key = `${folder}/${(0, uuid_1.v4)()}.${ext}`;
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ContentLength: file.size,
        }));
        return { url: `${this.publicUrl}/${key}`, key };
    }
    async deleteFile(key) {
        await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }
    async getPresignedUrl(key, expiresIn = 3600) {
        const command = new client_s3_1.PutObjectCommand({ Bucket: this.bucket, Key: key });
        return (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn });
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map