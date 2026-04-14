import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [RealtimeModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
