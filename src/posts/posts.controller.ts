import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { PostsService } from './posts.service';
import { OwnershipGuard } from './guards/ownership.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post (authenticated)' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: JwtPayload) {
    return this.postsService.create(dto, user);
  }

  @Patch(':slug')
  @UseGuards(OwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post (author or admin)' })
  @ApiParam({ name: 'slug', example: 'getting-started-with-nestjs' })
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.postsService.update(slug, dto, user);
  }

  @Delete(':slug')
  @UseGuards(OwnershipGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a post (author or admin)' })
  @ApiParam({ name: 'slug', example: 'getting-started-with-nestjs' })
  remove(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.postsService.remove(slug, user);
  }

  @Get()
  @Public()
  @Throttle({ global: { limit: 200, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'List published posts with cursor-based pagination and optional filters',
  })
  findAll(@Query() query: PostQueryDto) {
    return this.postsService.findAll(query);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary:
      'Get a single published post by slug (increments Redis view counter)',
  })
  @ApiParam({ name: 'slug', example: 'getting-started-with-nestjs' })
  findOne(@Param('slug') slug: string) {
    return this.postsService.findBySlug(slug);
  }
}
