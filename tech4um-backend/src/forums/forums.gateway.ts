import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ForumsService } from './forums.service';
import { LoginPayloadDto } from '../auth/dtos/login-payload.dto';

interface JoinForumPayload {
  forumId: number;
}

interface SendMessagePayload {
  forumId: number;
  text: string;
}

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true,
  },
})
export class ForumsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly socketUsers = new Map<string, LoginPayloadDto>();
  private readonly socketRoom = new Map<string, number>();

  constructor(
    private readonly forumsService: ForumsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractAccessTokenFromCookie(client);

    if (!token) {
      client.emit('chat_error', { message: 'Usuario nao autenticado' });
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<LoginPayloadDto>(token, {
        secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
      });

      this.socketUsers.set(client.id, payload);
    } catch {
      client.emit('chat_error', { message: 'Token invalido ou expirado' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const forumId = this.socketRoom.get(client.id);

    if (forumId) {
      this.socketRoom.delete(client.id);
      this.emitOnlineParticipants(forumId);
    }

    this.socketUsers.delete(client.id);
  }

  @SubscribeMessage('join_forum')
  async joinForum(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinForumPayload,
  ): Promise<void> {
    const user = this.socketUsers.get(client.id);

    if (!user) {
      client.emit('chat_error', { message: 'Usuario nao autenticado' });
      return;
    }

    const forumId = Number(payload?.forumId);

    if (!Number.isFinite(forumId) || forumId <= 0) {
      client.emit('chat_error', { message: 'Forum invalido' });
      return;
    }

    const previousForumId = this.socketRoom.get(client.id);
    if (previousForumId && previousForumId !== forumId) {
      client.leave(this.getForumRoom(previousForumId));
      this.emitOnlineParticipants(previousForumId);
    }

    await this.forumsService.ensureForumParticipant(forumId, Number(user.id));

    client.join(this.getForumRoom(forumId));
    this.socketRoom.set(client.id, forumId);

    const forumState = await this.forumsService.listForumById(forumId);
    client.emit('forum_state', forumState);

    this.emitOnlineParticipants(forumId);
  }

  @SubscribeMessage('leave_forum')
  async leaveForum(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinForumPayload,
  ): Promise<void> {
    const forumId = Number(payload?.forumId);

    if (!Number.isFinite(forumId) || forumId <= 0) {
      return;
    }

    client.leave(this.getForumRoom(forumId));

    const currentForum = this.socketRoom.get(client.id);
    if (currentForum === forumId) {
      this.socketRoom.delete(client.id);
    }

    this.emitOnlineParticipants(forumId);
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    const user = this.socketUsers.get(client.id);

    if (!user) {
      client.emit('chat_error', { message: 'Usuario nao autenticado' });
      return;
    }

    const forumId = Number(payload?.forumId);
    const text = `${payload?.text ?? ''}`.trim();

    if (!Number.isFinite(forumId) || forumId <= 0 || !text) {
      client.emit('chat_error', { message: 'Mensagem invalida' });
      return;
    }

    await this.forumsService.ensureForumParticipant(forumId, Number(user.id));

    const message = await this.forumsService.createPublicMessage(
      forumId,
      Number(user.id),
      text,
    );

    this.server.to(this.getForumRoom(forumId)).emit('forum_message_created', message);
  }

  @SubscribeMessage('typing_start')
  typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinForumPayload,
  ): void {
    const user = this.socketUsers.get(client.id);
    const forumId = Number(payload?.forumId);

    if (!user || !Number.isFinite(forumId) || forumId <= 0) {
      return;
    }

    client
      .to(this.getForumRoom(forumId))
      .emit('typing_start', { forumId, username: user.username });
  }

  @SubscribeMessage('typing_stop')
  typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinForumPayload,
  ): void {
    const user = this.socketUsers.get(client.id);
    const forumId = Number(payload?.forumId);

    if (!user || !Number.isFinite(forumId) || forumId <= 0) {
      return;
    }

    client
      .to(this.getForumRoom(forumId))
      .emit('typing_stop', { forumId, username: user.username });
  }

  private emitOnlineParticipants(forumId: number): void {
    const onlineUsers = new Map<string, string>();

    for (const [socketId, roomForumId] of this.socketRoom.entries()) {
      if (roomForumId !== forumId) {
        continue;
      }

      const user = this.socketUsers.get(socketId);
      if (!user) {
        continue;
      }

      onlineUsers.set(String(user.id), user.username);
    }

    this.server.to(this.getForumRoom(forumId)).emit('participants_online', {
      forumId,
      users: Array.from(onlineUsers.entries()).map(([id, username]) => ({
        id: Number(id),
        username,
      })),
    });
  }

  private getForumRoom(forumId: number): string {
    return `forum:${forumId}`;
  }

  private extractAccessTokenFromCookie(client: Socket): string | null {
    const cookieHeader = client.handshake.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';');

    for (const cookiePart of cookies) {
      const [rawKey, ...rawValue] = cookiePart.trim().split('=');
      if (rawKey === 'accessToken') {
        return decodeURIComponent(rawValue.join('='));
      }
    }

    return null;
  }
}
