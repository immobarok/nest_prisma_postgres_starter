import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
  Get,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { MinioService } from '../minio/minio.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly minioService: MinioService,
  ) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    const result = await this.minioService.upload(file, folder || 'posts');
    return {
      success: true,
      message: 'File uploaded successfully',
      data: { url: result.url, presignedUrl: result.presignedUrl },
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB each
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    const results = await this.minioService.uploadMultiple(
      files,
      folder || 'posts',
    );
    const urls = results.map((result) => result.url);
    const presignedUrls = results.map((result) => result.presignedUrl);
    return {
      success: true,
      message: 'Files uploaded successfully',
      data: { urls, presignedUrls },
    };
  }

  @Post('set-policy')
  async setBucketPolicy() {
    await this.minioService.setPublicReadPolicy();
    return {
      success: true,
      message: 'Bucket policy set successfully',
    };
  }

  @Get('policy')
  async getBucketPolicy() {
    const policy = await this.minioService.getBucketPolicy();
    return {
      success: true,
      data: { policy },
    };
  }
}
