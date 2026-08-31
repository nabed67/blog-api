import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

import { DbService } from 'src/db/db.service';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import type { Configuration } from 'src/common/interfaces/config.interface';
import {
  AllowedMimeType,
  IMAGE_MAX_HEIGHT,
  IMAGE_MAX_WIDTH,
  IMAGE_WEBP_QUALITY,
  MAGIC_BYTE_HEADER_LENGTH,
  MAGIC_BYTES,
  WEBP_SECONDARY_BYTES,
} from './constants/media.constants';

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(
    private readonly db: DbService,
    private readonly config: ConfigService<Configuration, true>,
  ) {
    this.region = this.config.get('S3_REGION', { infer: true });
    this.bucket = this.config.get('S3_BUCKET', { infer: true });
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.get('S3_KEY_ID', { infer: true }),
        secretAccessKey: this.config.get('S3_SECRET', { infer: true }),
      },
    });
  }

  /**
   * Full synchronous pipeline:
   *   1. Validate magic bytes against declared MIME type
   *   2. Resize to ≤ 1920×1080 and convert to WebP via sharp
   *   3. Upload compressed buffer directly to S3
   *   4. Persist Attachment record
   *   5. Return the record — url is immediately usable
   */
  async upload(file: Express.Multer.File, user: JwtPayload) {
    this.validateMagicBytes(file.mimetype as AllowedMimeType, file.buffer);

    const { data: webpBuffer, info } = await sharp(file.buffer)
      .resize({
        width: IMAGE_MAX_WIDTH,
        height: IMAGE_MAX_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const storageKey = `uploads/${user.sub}/${file.filename}-${randomUUID()}.webp`;
    const url = this.buildS3Url(storageKey);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: webpBuffer,
        ContentType: 'image/webp',
      }),
    );

    return this.db.attachment.create({
      data: {
        url,
        storageKey,
        type: 'IMAGE',
        mimeType: 'image/webp',
        size: webpBuffer.length,
        filename: file.originalname,
        width: info.width,
        height: info.height,
        status: 'READY',
        ownerId: user.sub,
      },
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
        size: true,
        mimeType: true,
        filename: true,
        createdAt: true,
      },
    });
  }

  /**
   * Validates the binary header of the uploaded file against the expected
   * magic bytes for the declared MIME type.
   * Throws UnprocessableEntityException if they don't match.
   */
  private validateMagicBytes(mimeType: AllowedMimeType, buffer: Buffer): void {
    const header = buffer.subarray(0, MAGIC_BYTE_HEADER_LENGTH);
    const patterns = MAGIC_BYTES[mimeType];

    if (!patterns?.length) {
      throw new UnprocessableEntityException(
        `Unsupported MIME type: ${mimeType}`,
      );
    }

    const primaryMatch = patterns.some(({ bytes, offset = 0 }) => {
      if (header.length < offset + bytes.length) return false;
      return bytes.every((byte, i) => header[offset + i] === byte);
    });

    if (!primaryMatch) {
      throw new UnprocessableEntityException(
        'File content does not match the declared MIME type',
      );
    }

    if (mimeType === 'image/webp') {
      const { bytes, offset } = WEBP_SECONDARY_BYTES;
      if (
        header.length < offset + bytes.length ||
        !bytes.every((byte, i) => header[offset + i] === byte)
      ) {
        throw new UnprocessableEntityException(
          'File content does not match the declared MIME type',
        );
      }
    }
  }

  private buildS3Url(storageKey: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }
}
