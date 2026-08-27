import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { DbService } from 'src/db/db.service';
import { UserRole } from 'src/users/interfaces/user-role.interface';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly db: DbService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user) return false;

    if (user.role === UserRole.ADMIN) return true;

    const slug = request.params['slug'];

    if (!slug || Array.isArray(slug))
      throw new NotFoundException('Slug param missing');

    const post = await this.db.post.findFirst({
      where: { slug, deletedAt: null },
      select: { authorId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== user.sub) {
      throw new ForbiddenException('You do not own this resource');
    }

    return true;
  }
}
