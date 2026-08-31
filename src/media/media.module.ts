import { Module } from '@nestjs/common';

import { DbModule } from 'src/db/db.module';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';

@Module({
  imports: [DbModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
