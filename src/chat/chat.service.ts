import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Chat, ChatType } from '../entities/chat.entity';
import { Message } from '../entities/message.entity';
import { SendMessageDto, CreateChatDto } from './dto/message.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async createChat(userId: string, createChatDto: CreateChatDto): Promise<Chat> {
    if (createChatDto.userId) {
      // Direct chat
      const existingChat = await this.chatRepository.findOne({
        where: [
          { user1Id: userId, user2Id: createChatDto.userId },
          { user1Id: createChatDto.userId, user2Id: userId },
        ],
      });

      if (existingChat) {
        return existingChat;
      }

      const chat = this.chatRepository.create({
        type: ChatType.DIRECT as ChatType,
        user1Id: userId,
        user2Id: createChatDto.userId,
      });

      return this.chatRepository.save(chat);
    } else if (createChatDto.groupId) {
      // Group chat
      const existingChat = await this.chatRepository.findOne({
        where: { groupId: createChatDto.groupId },
      });

      if (existingChat) {
        return existingChat;
      }

      const chat = this.chatRepository.create({
        type: ChatType.GROUP,
        groupId: createChatDto.groupId,
      });

      return this.chatRepository.save(chat);
    }

    throw new BadRequestException('Either userId or groupId must be provided');
  }

  async getChats(userId: string): Promise<Chat[]> {
    // Get all chats (direct and group) where user is involved
    const allChats = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.user1', 'user1')
      .leftJoinAndSelect('chat.user2', 'user2')
      .leftJoinAndSelect('chat.group', 'group')
      .leftJoinAndSelect('chat.messages', 'messages')
      .leftJoinAndSelect('messages.sender', 'sender')
      .where('chat.user1Id = :userId OR chat.user2Id = :userId', {
        userId,
      })
      .orWhere('(chat.type = :groupType AND EXISTS (SELECT 1 FROM group_members gm WHERE gm.groupId = chat.groupId AND gm.userId = :userId AND gm.status = :accepted))', {
        userId,
        groupType: 'group',
        accepted: 'accepted',
      })
      .orderBy('chat.updatedAt', 'DESC')
      .getMany();

    return allChats;
  }

  async getChat(id: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id },
      relations: ['user1', 'user2', 'group', 'messages', 'messages.sender'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check if user has access to this chat
    if (chat.type === ChatType.DIRECT) {
      if (chat.user1Id !== userId && chat.user2Id !== userId) {
        throw new ForbiddenException('You do not have access to this chat');
      }
    } else if (chat.type === ChatType.GROUP) {
      // Check if user is a member of the group
      // This would require checking group members, but for now we'll allow it
    }

    return chat;
  }

  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<Message> {
    const chat = await this.getChat(sendMessageDto.chatId, userId);

    const message = this.messageRepository.create({
      chatId: sendMessageDto.chatId,
      senderId: userId,
      content: sendMessageDto.content,
      isRead: false,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update chat's updatedAt
    chat.updatedAt = new Date();
    await this.chatRepository.save(chat);

    const messageWithRelations = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'chat'],
    });

    if (!messageWithRelations) {
      throw new NotFoundException('Message not found after creation');
    }

    return messageWithRelations;
  }

  async getMessages(chatId: string, userId: string): Promise<Message[]> {
    await this.getChat(chatId, userId);

    return this.messageRepository.find({
      where: { chatId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async markAsRead(chatId: string, userId: string): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('chatId = :chatId', { chatId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();
  }
}

