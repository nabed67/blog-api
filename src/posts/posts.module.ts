import { Module } from '@nestjs/common';

import { DbModule } from 'src/db/db.module';
import { CategoriesModule } from 'src/categories/categories.module';
import { OwnershipGuard } from './guards/ownership.guard';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [DbModule, CategoriesModule],
  controllers: [PostsController],
  providers: [PostsService, OwnershipGuard],
  exports: [PostsService],
})
export class PostsModule {}
