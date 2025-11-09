import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus } from '../entities/match.entity';
import { Chat, ChatType } from '../entities/chat.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {}

  async createMatch(requestedById: string, requestedToId: string) {
    if (requestedById === requestedToId) {
      throw new BadRequestException('Cannot match with yourself');
    }

    const existingMatch = await this.matchRepository.findOne({
      where: [
        { requestedById, requestedToId },
        { requestedById: requestedToId, requestedToId: requestedById },
      ],
    });

    if (existingMatch) {
      throw new ConflictException('Match already exists');
    }

    const match = this.matchRepository.create({
      requestedById,
      requestedToId,
      status: MatchStatus.PENDING,
    });

    return this.matchRepository.save(match);
  }

  async acceptMatch(matchId: string, userId: string) {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['requestedBy', 'requestedTo'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.requestedToId !== userId) {
      throw new BadRequestException('You can only accept matches sent to you');
    }

    if (match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('Match is not pending');
    }

    match.status = MatchStatus.ACCEPTED;
    await this.matchRepository.save(match);

    // Create a chat between matched users
    const existingChat = await this.chatRepository.findOne({
      where: [
        { user1Id: match.requestedById, user2Id: match.requestedToId },
        { user1Id: match.requestedToId, user2Id: match.requestedById },
      ],
    });

    if (!existingChat) {
      const chat = this.chatRepository.create({
        type: ChatType.DIRECT,
        user1Id: match.requestedById,
        user2Id: match.requestedToId,
      });
      await this.chatRepository.save(chat);
    }

    return match;
  }

  async rejectMatch(matchId: string, userId: string) {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.requestedToId !== userId) {
      throw new BadRequestException('You can only reject matches sent to you');
    }

    match.status = MatchStatus.REJECTED;
    return this.matchRepository.save(match);
  }

  async getMatches(userId: string) {
    return this.matchRepository.find({
      where: [
        { requestedById: userId },
        { requestedToId: userId },
      ],
      relations: ['requestedBy', 'requestedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAcceptedMatches(userId: string) {
    return this.matchRepository.find({
      where: [
        { requestedById: userId, status: MatchStatus.ACCEPTED },
        { requestedToId: userId, status: MatchStatus.ACCEPTED },
      ],
      relations: ['requestedBy', 'requestedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingMatches(userId: string) {
    return this.matchRepository.find({
      where: { requestedToId: userId, status: MatchStatus.PENDING },
      relations: ['requestedBy'],
      order: { createdAt: 'DESC' },
    });
  }
}

