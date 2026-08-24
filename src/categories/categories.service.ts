import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type Redis from 'ioredis';

import { DbService } from 'src/db/db.service';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CACHE_TTL_SECONDS = 3600;
const CACHE_KEY = 'categories:all';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly db: DbService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.db.category.findFirst({
      where: {
        OR: [{ name: dto.name }, { slug: dto.slug }],
        deletedAt: null,
      },
      select: { name: true, slug: true },
    });

    if (existing) {
      const field = existing.name === dto.name ? 'name' : 'slug';
      throw new ConflictException(
        `A category with this ${field} already exists`,
      );
    }

    const category = await this.db.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
      select: CATEGORY_SELECT,
    });

    await this.invalidateCache();

    return category;
  }

  async findAll() {
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as (typeof CATEGORY_SELECT)[];
    }

    const categories = await this.db.category.findMany({
      where: { deletedAt: null },
      select: CATEGORY_SELECT,
      orderBy: { name: 'asc' },
    });

    await this.redis.set(
      CACHE_KEY,
      JSON.stringify(categories),
      'EX',
      CACHE_TTL_SECONDS,
    );

    return categories;
  }

  async findOne(id: number) {
    const category = await this.db.category.findFirst({
      where: { id, deletedAt: null },
      select: CATEGORY_SELECT,
    });

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.name || dto.slug) {
      const conflict = await this.db.category.findFirst({
        where: {
          OR: [
            ...(dto.name ? [{ name: dto.name }] : []),
            ...(dto.slug ? [{ slug: dto.slug }] : []),
          ],
          NOT: { id },
          deletedAt: null,
        },
        select: { name: true, slug: true },
      });

      if (conflict) {
        const field = conflict.name === dto.name ? 'name' : 'slug';
        throw new ConflictException(
          `Another category with this ${field} already exists`,
        );
      }
    }

    const updated = await this.db.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      select: CATEGORY_SELECT,
    });

    await this.invalidateCache();

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.db.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.invalidateCache();
  }

  private async invalidateCache() {
    await this.redis.del(CACHE_KEY);
  }
}
