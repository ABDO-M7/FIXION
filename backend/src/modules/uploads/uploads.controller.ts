import {
  Controller, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @UploadedFile() file: any,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.uploadsService.uploadFile(file, `users/${userId}`);
    return result;
  }

  @Delete(':key')
  async delete(@Param('key') key: string) {
    await this.uploadsService.deleteFile(decodeURIComponent(key));
    return { message: 'File deleted' };
  }
}
