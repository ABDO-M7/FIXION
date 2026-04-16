import { ConfigService } from '@nestjs/config';
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}
export declare class UploadsService {
    private configService;
    private s3;
    private bucket;
    private publicUrl;
    constructor(configService: ConfigService);
    uploadFile(file: MulterFile, folder?: string): Promise<{
        url: string;
        key: string;
    }>;
    deleteFile(key: string): Promise<void>;
    getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
}
export {};
