import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSocketMap = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      let token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(';').reduce((res: any, item: string) => {
          const parts = item.trim().split('=');
          if (parts.length === 2) res[parts[0]] = parts[1];
          return res;
        }, {});
        token = cookies['accessToken'] || cookies['access_token'];
      }

      if (!token) {
        this.logger.warn(`[WS] Connection rejected: No auth token for socket ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);

      if (!this.userSocketMap.has(payload.sub)) {
        this.userSocketMap.set(payload.sub, new Set());
      }
      this.userSocketMap.get(payload.sub)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch (err: any) {
      this.logger.warn(`[WS] Auth failed for socket ${client.id}: ${err?.message || err}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSocketMap.has(userId)) {
      this.userSocketMap.get(userId)!.delete(client.id);
      if (this.userSocketMap.get(userId)!.size === 0) {
        this.userSocketMap.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}
