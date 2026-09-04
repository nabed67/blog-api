import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import DOMPurify from 'isomorphic-dompurify';

import { DbService } from 'src/db/db.service';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/interfaces/user-role.interface';
import { decodeCursor, encodeCursor } from 'src/utils/helpers';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';
import { COMMENT_SELECT } from './constants';

interface CommentCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class CommentsService {
  constructor(private readonly db: DbService) {}

  async createForPost(postId: number, dto: CreateCommentDto, user: JwtPayload) {
    const post = await this.db.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException(`Post #${postId} not found`);
    }

    if (dto.parentId) {
      const parent = await this.db.comment.findFirst({
        where: { id: dto.parentId, postId, deletedAt: null },
        select: { id: true, parentId: true },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found on this post');
      }

      if (parent.parentId !== null) {
        throw new BadRequestException(
          'Cannot reply to a reply — maximum comment depth is 1',
        );
      }
    }

    const content = this.sanitize(dto.content);

    return this.db.comment.create({
      data: {
        postId,
        content,
        authorId: user.sub,
        parentId: dto.parentId ?? null,
      },
      select: COMMENT_SELECT,
    });
  }

  async findAllForPost(postId: number, query: CommentQueryDto) {
    const post = await this.db.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException(`Post #${postId} not found`);
    }

    const limit = query.limit ?? 20;
    let cursorFilter: object | undefined;

    if (query.cursor) {
      const c = decodeCursor<CommentCursor>(query.cursor);
      const cursorDate = new Date(c.createdAt);

      cursorFilter = {
        OR: [
          { createdAt: { gt: cursorDate } },
          { AND: [{ createdAt: cursorDate }, { id: { gt: c.id } }] },
        ],
      };
    }

    const comments = await this.db.comment.findMany({
      where: {
        postId,
        parentId: null,
        ...(cursorFilter !== undefined && { AND: [cursorFilter] }),
      },
      select: COMMENT_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasNextPage = comments.length > limit;
    const items = hasNextPage ? comments.slice(0, limit) : comments;
    const last = items.at(-1);

    let nextCursor: string | null = null;
    if (hasNextPage && last) {
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last.id });
    }

    return {
      items,
      nextCursor,
      hasNextPage,
    };
  }

  async findReplies(commentId: number, query: CommentQueryDto) {
    const parent = await this.db.comment.findFirst({
      where: { id: commentId },
      select: { id: true, parentId: true },
    });

    if (!parent) {
      throw new NotFoundException('Comment not found');
    }

    if (parent.parentId !== null) {
      throw new BadRequestException(
        'Replies do not have nested replies — maximum comment depth is 1',
      );
    }

    const limit = query.limit ?? 20;
    let cursorFilter: object | undefined;

    if (query.cursor) {
      const c = decodeCursor<CommentCursor>(query.cursor);
      const cursorDate = new Date(c.createdAt);

      cursorFilter = {
        OR: [
          { createdAt: { gt: cursorDate } },
          { AND: [{ createdAt: cursorDate }, { id: { gt: c.id } }] },
        ],
      };
    }

    const replies = await this.db.comment.findMany({
      where: {
        parentId: commentId,
        ...(cursorFilter !== undefined && { AND: [cursorFilter] }),
      },
      select: COMMENT_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasNextPage = replies.length > limit;
    const items = hasNextPage ? replies.slice(0, limit) : replies;
    const last = items.at(-1);

    let nextCursor: string | null = null;
    if (hasNextPage && last) {
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last.id });
    }

    return {
      items,
      nextCursor,
      hasNextPage,
    };
  }

  async update(commentId: number, dto: UpdateCommentDto, user: JwtPayload) {
    const comment = await this.db.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true, authorId: true, createdAt: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== user.sub) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const content = this.sanitize(dto.content);

    return this.db.comment.update({
      where: { id: commentId },
      data: { content },
      select: COMMENT_SELECT,
    });
  }

  async remove(commentId: number, user: JwtPayload) {
    const comment = await this.db.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (user.role !== UserRole.ADMIN && comment.authorId !== user.sub) {
      throw new ForbiddenException('You do not own this comment');
    }

    await this.db.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }

  // =========================================================
  // Helpers
  // =========================================================

  private sanitize(text: string) {
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
}
