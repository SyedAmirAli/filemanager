import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessagesController } from './messages.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [MessagesController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
