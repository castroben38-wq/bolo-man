import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';

@WebSocketGateway({
  namespace: 'messaging',
  cors: { origin: '*' },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private messagingService: MessagingService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    client.leave(`user:${client.data.userId}`);
  }

  @SubscribeMessage('conversation:join')
  handleJoinRoom(client: Socket, conversationId: string) {
    client.join(`conversation:${conversationId}`);
    return { status: 'joined' };
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveRoom(client: Socket, conversationId: string) {
    client.leave(`conversation:${conversationId}`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    client: Socket,
    payload: { conversationId: string; content: string },
  ) {
    const message = await this.messagingService.sendMessage(
      payload.conversationId,
      client.data.userId,
      payload.content,
    );

    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit('message:new', message);

    return message;
  }

  @SubscribeMessage('message:read')
  async handleRead(
    client: Socket,
    payload: { conversationId: string },
  ) {
    await this.messagingService.markAsRead(payload.conversationId, client.data.userId);
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit('message:read', { userId: client.data.userId });
  }
}
