import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class UploadService {
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get('MINIO_BUCKET') || 'uploads';

    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get('MINIO_PORT') || '9000'),
      useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get('MINIO_SECRET_KEY') || 'minioadmin',
    });

    this.initBucket();
  }

  private async initBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        console.log(`Bucket '${this.bucketName}' created successfully`);

        // Set bucket policy to allow public read access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy),
        );
      }
    } catch (error) {
      console.error('Error initializing MinIO bucket:', error);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'posts',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      // Return the public URL
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const port = this.configService.get('MINIO_PORT') || '9000';
      const useSSL = this.configService.get('MINIO_USE_SSL') === 'true';
      const protocol = useSSL ? 'https' : 'http';

      return `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'posts',
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract object name from URL
      const urlParts = fileUrl.split(`/${this.bucketName}/`);
      if (urlParts.length < 2) {
        throw new BadRequestException('Invalid file URL');
      }
      const objectName = urlParts[1];

      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  async getPresignedUrl(
    objectName: string,
    expirySeconds: number = 3600,
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expirySeconds,
      );
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new BadRequestException('Failed to generate presigned URL');
    }
  }
}
