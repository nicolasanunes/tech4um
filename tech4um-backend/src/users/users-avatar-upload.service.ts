import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class UsersAvatarUploadService {
  private readonly logger = new Logger(UsersAvatarUploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.getRequiredConfig('AWS_REGION');
    this.bucketName = this.getRequiredConfig('AWS_S3_BUCKET');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.getRequiredConfig('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.getRequiredConfig('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadAvatar(file: UploadedImageFile, userId: number): Promise<string> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Arquivo de imagem invalido');
    }

    const fileExtension = this.resolveFileExtension(file);
    const key = `users/${userId}/avatar/${Date.now()}-${randomUUID()}${fileExtension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch {
      throw new InternalServerErrorException('Falha ao enviar imagem para o armazenamento');
    }

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async deleteAvatarByUrl(avatarUrl: string): Promise<void> {
    const key = this.resolveObjectKeyFromUrl(avatarUrl);

    if (!key) {
      return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch {
      this.logger.warn(`Falha ao remover avatar antigo do bucket: key=${key}`);
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();

    if (!value) {
      throw new Error(`${key} is required`);
    }

    return value;
  }

  private resolveFileExtension(file: UploadedImageFile): string {
    const originalExtension = extname(file.originalname || '').trim().toLowerCase();

    if (originalExtension) {
      return originalExtension;
    }

    const mimeExtension = file.mimetype.split('/')[1]?.toLowerCase() ?? 'bin';
    return mimeExtension ? `.${mimeExtension.replace(/[^a-z0-9+.-]/g, '')}` : '.bin';
  }

  private resolveObjectKeyFromUrl(avatarUrl: string): string | null {
    try {
      const parsedUrl = new URL(avatarUrl);
      const expectedHostPrefix = `${this.bucketName}.s3.`;

      if (!parsedUrl.hostname.startsWith(expectedHostPrefix)) {
        return null;
      }

      if (!parsedUrl.hostname.endsWith('.amazonaws.com')) {
        return null;
      }

      const key = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
      return key || null;
    } catch {
      return null;
    }
  }
}