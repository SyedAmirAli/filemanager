import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './chat/chat.module';
import { RealtimeModule } from './realtime/realtime.module';
import { FilesModule } from './files/files.module';
import { SecurityModule } from './security/security.module';
import { SecurityPinMiddleware } from './security/security-pin.middleware';

@Module({
  imports: [PrismaModule, ChatModule, RealtimeModule, FilesModule, SecurityModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityPinMiddleware)
      .exclude({ path: 'api/security/pin/verify', method: RequestMethod.POST })
      .forRoutes({ path: 'api/(.*)', method: RequestMethod.ALL });
  }
}
