import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './chat/chat.module';
import { RealtimeModule } from './realtime/realtime.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [PrismaModule, ChatModule, RealtimeModule, FilesModule],
})
export class AppModule {}
