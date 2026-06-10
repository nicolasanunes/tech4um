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
  text?: string;
  imageUrl?: string;
}

@WebSocketGateway({
  namespace: 'chat',
  maxHttpBufferSize: 8 * 1024 * 1024,
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
      await this.emitOnlineParticipants(forumId);
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

    try {
      await this.forumsService.ensureForumParticipant(forumId, Number(user.id));

      client.join(this.getForumRoom(forumId));
      this.socketRoom.set(client.id, forumId);

      const forumState = await this.forumsService.listForumById(forumId);
      client.emit('forum_state', forumState);

      await this.emitOnlineParticipants(forumId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao entrar no forum';
      client.emit('chat_error', { message });
    }
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

    await this.emitOnlineParticipants(forumId);
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
    const imageUrl = `${payload?.imageUrl ?? ''}`.trim();

    if (
      !Number.isFinite(forumId) ||
      forumId <= 0 ||
      (!text && !imageUrl)
    ) {
      client.emit('chat_error', { message: 'Mensagem invalida' });
      return;
    }

    if (imageUrl && !this.isValidImageDataUrl(imageUrl)) {
      client.emit('chat_error', { message: 'Imagem invalida ou muito grande' });
      return;
    }

    try {
      await this.forumsService.ensureForumParticipant(forumId, Number(user.id));

      const message = await this.forumsService.createPublicMessage(
        forumId,
        Number(user.id),
        text,
        imageUrl || null,
      );

      this.server
        .to(this.getForumRoom(forumId))
        .emit('forum_message_created', message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao enviar mensagem';
      client.emit('chat_error', { message });
    }
  }

  @SubscribeMessage('typing_start')
  async typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinForumPayload,
  ): Promise<void> {
    const user = this.socketUsers.get(client.id);
    const forumId = Number(payload?.forumId);

    if (!user || !Number.isFinite(forumId) || forumId <= 0) {
      return;
    }

    const username = await this.resolveUsername(user);
    if (!username) {
      return;
    }

    client
      .to(this.getForumRoom(forumId))
      .emit('typing_start', { forumId, username });
  }

  @SubscribeMessage('typing_stop')
  async typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinForumPayload,
  ): Promise<void> {
    const user = this.socketUsers.get(client.id);
    const forumId = Number(payload?.forumId);

    if (!user || !Number.isFinite(forumId) || forumId <= 0) {
      return;
    }

    const username = await this.resolveUsername(user);
    if (!username) {
      return;
    }

    client
      .to(this.getForumRoom(forumId))
      .emit('typing_stop', { forumId, username });
  }

  private async resolveUsername(user: LoginPayloadDto): Promise<string | null> {
    if (user.username?.trim()) {
      return user.username.trim();
    }

    const userId = Number(user.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return null;
    }

    const users = await this.forumsService.listUsersBasicByIds([userId]);
    const username = users[0]?.username?.trim();
    return username || null;
  }

  private async emitOnlineParticipants(forumId: number): Promise<void> {
    const onlineUserIds = new Set<number>();

    for (const [socketId, roomForumId] of this.socketRoom.entries()) {
      if (roomForumId !== forumId) {
        continue;
      }

      const user = this.socketUsers.get(socketId);
      if (!user) {
        continue;
      }

      onlineUserIds.add(Number(user.id));
    }

    const users = await this.forumsService.listUsersBasicByIds(
      Array.from(onlineUserIds),
    );

    this.server.to(this.getForumRoom(forumId)).emit('participants_online', {
      forumId,
      users,
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

  private isValidImageDataUrl(value: string): boolean {
    if (!value.startsWith('data:image/')) {
      return false;
    }

    const commaIndex = value.indexOf(',');
    if (commaIndex < 0) {
      return false;
    }

    const metadata = value.slice(0, commaIndex).toLowerCase();
    if (!metadata.includes(';base64')) {
      return false;
    }

    const base64 = value.slice(commaIndex + 1);
    const estimatedBytes = Math.floor((base64.length * 3) / 4);

    return estimatedBytes <= 5 * 1024 * 1024;
  }
} 
