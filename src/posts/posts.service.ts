import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type Redis from 'ioredis';
import DOMPurify from 'isomorphic-dompurify';

import { DbService } from 'src/db/db.service';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { CategoriesService } from 'src/categories/categories.service';
import { UserRole } from 'src/users/interfaces/user-role.interface';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { PostStatus } from './interfaces/post-status.interface';
import { PaginationCursor } from './interfaces/pagination-cursor.interface';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { ALLOWED_TAGS, ALLOWED_ATTR, POST_SELECT } from './constants';

@Injectable()
export class PostsService {
  constructor(
    private readonly db: DbService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(dto: CreatePostDto, user: JwtPayload) {
    const slug = await this.generateSlug(dto.title);
    const content = this.sanitizeContent(dto.content);

    if (dto.categoryId) {
      await this.categoriesService.findOne(dto.categoryId);
    }

    return this.db.post.create({
      data: {
        slug,
        content,
        title: dto.title,
        authorId: user.sub,
        categoryId: dto.categoryId ?? null,
        status: dto.status ?? PostStatus.DRAFT,
      },
      select: POST_SELECT,
    });
  }

  async findAll(query: PostQueryDto) {
    const limit = query.limit ?? 10;
    let cursorFilter: object | undefined;

    if (query.cursor) {
      const c = this.decodeCursor(query.cursor);
      const cursorDate = new Date(c.createdAt);

      cursorFilter = {
        OR: [
          { createdAt: { lt: cursorDate } },
          { AND: [{ createdAt: cursorDate }, { id: { lt: c.id } }] },
        ],
      };
    }

    const posts = await this.db.post.findMany({
      where: {
        deletedAt: null,
        status: PostStatus.PUBLISHED,
        ...(query.categoryId !== undefined && { categoryId: query.categoryId }),
        ...(query.authorId !== undefined && { authorId: query.authorId }),
        ...(cursorFilter !== undefined && { AND: [cursorFilter] }),
      },
      select: POST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasNextPage = posts.length > limit;
    const items = hasNextPage ? posts.slice(0, limit) : posts;
    const last = items.at(-1);

    return {
      items,
      nextCursor:
        hasNextPage && last ? this.encodeCursor(last.createdAt, last.id) : null,
      hasNextPage,
    };
  }

  async findBySlug(slug: string) {
    const post = await this.db.post.findFirst({
      where: {
        slug,
        deletedAt: null,
        status: PostStatus.PUBLISHED,
      },
      select: POST_SELECT,
    });

    if (!post) {
      throw new NotFoundException(`Post '${slug}' not found`);
    }

    void this.redis.incr(`post:views:${post.id}`);

    return post;
  }

  async update(slug: string, dto: UpdatePostDto, user: JwtPayload) {
    const existing = await this.db.post.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Post '${slug}' not found`);
    }

    if (user.role !== UserRole.ADMIN && existing.authorId !== user.sub) {
      throw new ForbiddenException('You do not own this post');
    }

    const data: Record<string, unknown> = {};

    if (dto.title) {
      data.title = dto.title;
      data.slug = await this.generateSlug(dto.title, existing.id);
    }

    if (dto.content) {
      data.content = this.sanitizeContent(dto.content);
    }

    if (dto.status) {
      data.status = dto.status;
    }

    if (dto.categoryId) {
      const category = await this.categoriesService.findOne(dto.categoryId);
      data.categoryId = category.id;
    }

    return this.db.post.update({
      where: { id: existing.id },
      data,
      select: POST_SELECT,
    });
  }

  async remove(slug: string, user: JwtPayload) {
    const existing = await this.db.post.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Post '${slug}' not found`);
    }

    if (user.role !== UserRole.ADMIN && existing.authorId !== user.sub) {
      throw new ForbiddenException('You do not own this post');
    }

    await this.db.post.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
  }

  /** ================================
   * Helper functions
   * ================================
   */
  private sanitizeContent(html: string) {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
  }

  private async generateSlug(title: string, excludeId?: number) {
    const base = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const conflict = await this.db.post.findFirst({
      where: {
        slug: base,
        deletedAt: null,
        ...(excludeId !== undefined && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });

    if (!conflict) return base;

    const suffix = Math.random().toString(36).slice(2, 7);
    return `${base}-${suffix}`;
  }

  private decodeCursor(cursor: string) {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    return JSON.parse(json) as PaginationCursor;
  }

  private encodeCursor(createdAt: Date, id: number) {
    return Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    ).toString('base64url');
  }
}
