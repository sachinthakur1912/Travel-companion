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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/message.dto';
import { logger } from '../common/logger';

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
      
      logger.log(`User ${payload.sub} connected via Socket.IO (socketId: ${client.id})`);

      // Notify user is online
      this.server.emit('user:online', { userId: payload.sub });
    } catch (error) {
      logger.error('Socket connection error:', error);
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

      // Get chat to determine recipients (lightweight, no relations)
      const chat = await this.chatService.getChatForGateway(data.chatId, client.userId);

      // Use chat rooms for reliable message delivery
      const chatRoom = `chat:${data.chatId}`;
      
      // Emit to chat room (all users in the chat will receive it)
      this.server.to(chatRoom).emit('message:new', message);
      
      // Also emit confirmation to sender
      client.emit('message:sent', message);

      return { success: true, message };
    } catch (error) {
      logger.error('Error sending message via gateway:', error);
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

    try {
      const chatRoom = `chat:${data.chatId}`;
      client.join(chatRoom);
      
      logger.log(`User ${client.userId} joined chat room ${chatRoom}`);
      
      return { success: true, room: chatRoom };
    } catch (error) {
      logger.error('Error joining chat room:', error);
      return { error: 'Failed to join chat room' };
    }
  }

  // Public method to emit to room (for HTTP API fallback)
  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
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

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const chatRoom = `chat:${data.chatId}`;
      
      // Verify client is in the room
      const clientRooms = Array.from(client.rooms);
      if (!clientRooms.includes(chatRoom)) {
        client.join(chatRoom);
      }
      
      // Emit to all users in chat room except sender
      this.server.to(chatRoom).except(client.id).emit('typing:start', {
        chatId: data.chatId,
        userId: client.userId,
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error handling typing:start:', error);
      return { error: 'Failed to handle typing start' };
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const chatRoom = `chat:${data.chatId}`;
      
      // Verify client is in the room
      const clientRooms = Array.from(client.rooms);
      if (!clientRooms.includes(chatRoom)) {
        client.join(chatRoom);
      }
      
      // Emit to all users in chat room except sender
      this.server.to(chatRoom).except(client.id).emit('typing:stop', {
        chatId: data.chatId,
        userId: client.userId,
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error handling typing:stop:', error);
      return { error: 'Failed to handle typing stop' };
    }
  }
}

