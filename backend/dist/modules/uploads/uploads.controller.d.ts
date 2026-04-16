import { UploadsService } from './uploads.service';
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    upload(file: any, userId: string): Promise<{
        url: string;
        key: string;
    }>;
    delete(key: string): Promise<{
        message: string;
    }>;
}
