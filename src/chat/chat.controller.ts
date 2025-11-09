import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, CreateChatDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  async createChat(@GetUser() user: User, @Body() createChatDto: CreateChatDto) {
    return this.chatService.createChat(user.id, createChatDto);
  }

  @Get()
  async getChats(@GetUser() user: User) {
    return this.chatService.getChats(user.id);
  }

  @Get(':id')
  async getChat(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.chatService.getChat(id, user.id);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.chatService.getMessages(id, user.id);
  }

  @Post('send')
  async sendMessage(@GetUser() user: User, @Body() sendMessageDto: SendMessageDto) {
    return this.chatService.sendMessage(user.id, sendMessageDto);
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    await this.chatService.markAsRead(id, user.id);
    return { message: 'Messages marked as read' };
  }
}

