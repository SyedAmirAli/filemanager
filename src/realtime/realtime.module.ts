import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [forwardRef(() => ChatModule)],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
