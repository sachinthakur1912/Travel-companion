import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/message.dto';
import { ChatType } from '../entities/chat.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);

      // Join user's personal room
      client.join(`user:${payload.sub}`);

      // Notify user is online
      this.server.emit('user:online', { userId: payload.sub });
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.server.emit('user:offline', { userId: client.userId });
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.chatService.sendMessage(client.userId, data);

      // Get chat to determine recipients
      const chat = await this.chatService.getChat(data.chatId, client.userId);

      // Emit to appropriate users
      if (chat.type === ChatType.DIRECT) {
        const otherUserId = chat.user1Id === client.userId ? chat.user2Id : chat.user1Id;
        const otherUserSocketId = this.connectedUsers.get(otherUserId);
        
        if (otherUserSocketId) {
          this.server.to(otherUserSocketId).emit('message:new', message);
        }
        
        // Also emit to sender
        client.emit('message:sent', message);
      } else if (chat.type === ChatType.GROUP && chat.groupId) {
        // Emit to all group members
        this.server.to(`group:${chat.groupId}`).emit('message:new', message);
      }

      return { success: true, message };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    client.join(`chat:${data.chatId}`);
    return { success: true };
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    client.leave(`chat:${data.chatId}`);
    return { success: true };
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    await this.chatService.markAsRead(data.chatId, client.userId);
    return { success: true };
  }
}

