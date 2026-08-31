import {
  Controller,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { MediaService } from './media.service';
import { MAX_IMAGE_SIZE, MIME_WHITELIST } from './constants/media.constants';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ global: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: `Image file (${MIME_WHITELIST.join(', ')}). Max ${MAX_IMAGE_SIZE / 1024 / 1024} MB.`,
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload and compress an image to S3',
    description:
      'Accepts a multipart image. The server validates magic bytes, resizes to ≤ 1920×1080, ' +
      'converts to WebP, uploads to S3, and returns the final URL synchronously.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'Attachment created. The url field is ready to use immediately.',
    schema: {
      example: {
        id: 1,
        url: 'https://bucket.s3.us-east-1.amazonaws.com/uploads/7/uuid.webp',
        width: 1280,
        height: 720,
        size: 84321,
        mimeType: 'image/webp',
        filename: 'cover.jpg',
        createdAt: '2026-08-31T16:00:00.000Z',
      },
    },
  })
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
            errorMessage:
              'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
          }),
        ],
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mediaService.upload(file, user);
  }
}
