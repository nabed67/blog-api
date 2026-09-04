import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Great article! Really helped me understand the concept.',
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({
    description:
      'Parent comment id for replies. Max depth is 1 — you cannot reply to a reply.',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @IsPositive({ message: 'Parent comment id must be a positive number' })
  parentId?: number;
}
