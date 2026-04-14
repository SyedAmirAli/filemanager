import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../chat/chat.service';

export type MessagePayload = {
    id: string;
    body: string;
    createdAt: string;
    editedAt: string | null;
    pinned: boolean;
    pinnedAt: string | null;
};

@WebSocketGateway({
    cors: { origin: '*' },
})
export class RealtimeGateway {
    @WebSocketServer()
    server!: Server;

    constructor(private readonly chat: ChatService) {}

    emitFilesChanged() {
        this.server.emit('filesChanged', { at: new Date().toISOString() });
    }

    emitMessageUpdated(payload: MessagePayload) {
        this.server.emit('messageUpdated', payload);
    }

    emitMessageDeleted(id: string) {
        this.server.emit('messageDeleted', { id });
    }

    emitMessagesBulkDeleted(ids: string[]) {
        this.server.emit('messagesBulkDeleted', { ids });
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(@MessageBody() payload: { text?: string }, @ConnectedSocket() client: Socket) {
        const text = typeof payload?.text === 'string' ? payload.text : '';
        try {
            const msg = await this.chat.createMessage(text);
            const payloadOut = this.chat.serialize(msg);
            this.server.emit('newMessage', payloadOut);
            return { ok: true };
        } catch {
            client.emit('messageError', { ok: false });
            return { ok: false };
        }
    }
}
