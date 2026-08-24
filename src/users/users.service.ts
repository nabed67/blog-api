import { Injectable, NotFoundException } from '@nestjs/common';

import { DbService } from 'src/db/db.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PROFILE_SELECT = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  avatar: true,
  bio: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

  async getProfile(userId: number) {
    const user = await this.db.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      select: PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.db.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.db.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
      select: PROFILE_SELECT,
    });
  }
}
