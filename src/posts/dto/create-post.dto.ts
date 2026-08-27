import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostStatus } from '../interfaces/post-status.interface';

export class CreatePostDto {
  @ApiProperty({ example: 'Getting Started with NestJS', maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: '<p>Welcome to NestJS, a progressive Node.js framework...</p>',
    description: 'Sanitized HTML content',
  })
  @IsString()
  @MinLength(10)
  content!: string;

  @ApiPropertyOptional({ enum: PostStatus, default: PostStatus.DRAFT })
  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @ApiPropertyOptional({ example: 1, description: 'Category id' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  categoryId?: number;
}
