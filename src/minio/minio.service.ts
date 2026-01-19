import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get('MINIO_BUCKET') || 'uploads';

    this.client = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get('MINIO_PORT') || '9000'),
      useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get('MINIO_SECRET_KEY') || 'minioadmin',
    });
  }

  async onModuleInit() {
    await this.initBucket();
  }

  private async initBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName);
        console.log(`Bucket '${this.bucketName}' created successfully`);

        // Set bucket policy for public read access (MinIO format)
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.client.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy),
        );
        console.log(
          `Bucket policy set for public read access on '${this.bucketName}'`,
        );
      } else {
        console.log(`Bucket '${this.bucketName}' already exists`);
        // Try to set policy even if bucket exists
        try {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucketName}/*`],
              },
            ],
          };
          await this.client.setBucketPolicy(
            this.bucketName,
            JSON.stringify(policy),
          );
          console.log(`Bucket policy updated for '${this.bucketName}'`);
        } catch (policyError) {
          console.error('Error setting bucket policy:', policyError);
        }
      }
    } catch (error) {
      // Check for connection refused error
      if (
        error.code === 'ECONNREFUSED' ||
        (error.errors && error.errors.some((e) => e.code === 'ECONNREFUSED'))
      ) {
        console.warn(`
⚠️  WARNING: Could not connect to MinIO at ${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}.
   File uploads will not work.
   Please ensure MinIO is running. You can start it using:
   docker-compose up -d
`);
      } else {
        console.error('Error initializing MinIO bucket:', error);
      }
      // Don't throw error here, just log it
    }
  }

  async upload(
    file: Express.Multer.File,
    folder: string = 'posts',
  ): Promise<{ url: string; presignedUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

    try {
      await this.client.putObject(
        this.bucketName,
        fileName,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );

      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const port = this.configService.get('MINIO_PORT') || '9000';
      const useSSL = this.configService.get('MINIO_USE_SSL') === 'true';
      const protocol = useSSL ? 'https' : 'http';

      const url = `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
      const presignedUrl = await this.client.presignedGetObject(
        this.bucketName,
        fileName,
        24 * 60 * 60, // 24 hours
      );

      return { url, presignedUrl };
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string = 'posts',
  ): Promise<{ url: string; presignedUrl: string }[]> {
    const uploadPromises = files.map((file) => this.upload(file, folder));
    return Promise.all(uploadPromises);
  }

  async delete(fileUrl: string): Promise<void> {
    try {
      const urlParts = fileUrl.split(`/${this.bucketName}/`);
      if (urlParts.length < 2) {
        throw new BadRequestException('Invalid file URL');
      }
      const objectName = urlParts[1];

      await this.client.removeObject(this.bucketName, objectName);
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  async setPublicReadPolicy(): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };

      await this.client.setBucketPolicy(
        this.bucketName,
        JSON.stringify(policy),
      );
      console.log(`Public read policy set for bucket '${this.bucketName}'`);
    } catch (error) {
      console.error('Error setting public read policy:', error);
      throw new BadRequestException('Failed to set bucket policy');
    }
  }

  async getBucketPolicy(): Promise<string> {
    try {
      return await this.client.getBucketPolicy(this.bucketName);
    } catch (error) {
      console.error('Error getting bucket policy:', error);
      return 'No policy set or error retrieving policy';
    }
  }
}
