import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
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
import { CommentsService } from './comments.service';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Patch('comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edit a comment (author only, within 5-minute window)',
  })
  @ApiParam({ name: 'commentId', example: 1 })
  update(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.update(commentId, dto, user);
  }

  @Delete('comments/:commentId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Soft-delete a comment (author or admin) — content replaced with [deleted]',
  })
  @ApiParam({ name: 'commentId', example: 1 })
  remove(
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.remove(commentId, user);
  }

  @Get('comments/:commentId/replies')
  @Public()
  @Throttle({ global: { limit: 200, ttl: 60_000 } })
  @ApiOperation({
    summary: 'List replies for a comment (cursor-paginated)',
  })
  @ApiParam({ name: 'commentId', example: 1 })
  findReplies(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Query() query: CommentQueryDto,
  ) {
    return this.commentsService.findReplies(commentId, query);
  }
}
