import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  forwardRef,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('api/messages')
export class MessagesController {
  constructor(
    private readonly chat: ChatService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get()
  async list(
    @Query('limit') limitRaw?: string,
    @Query('before') before?: string,
  ) {
    const limit = limitRaw
      ? parseInt(limitRaw, 10)
      : this.chat.getDefaultLimit();
    return this.chat.findPage(Number.isFinite(limit) ? limit : this.chat.getDefaultLimit(), before);
  }

  @Patch(':id')
  async patch(
    @Param('id') id: string,
    @Body() body: { body?: string; pinned?: boolean },
  ) {
    const msg = await this.chat.updateMessage(id, {
      body: body.body,
      pinned: body.pinned,
    });
    const payload = this.chat.serialize(msg);
    this.realtime.emitMessageUpdated(payload);
    return payload;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.chat.deleteMessage(id);
    this.realtime.emitMessageDeleted(id);
    return { ok: true };
  }

  @Post('bulk-delete')
  async bulkDelete(@Body() body: { ids?: string[] }) {
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const count = await this.chat.bulkDelete(ids);
    if (count > 0) {
      this.realtime.emitMessagesBulkDeleted(ids);
    }
    return { ok: true, deleted: count };
  }
}
