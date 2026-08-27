import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PostQueryDto {
  @ApiPropertyOptional({
    description: 'Opaque base64 cursor from the previous page response',
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by category id' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Filter by author id' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  authorId?: number;
}
