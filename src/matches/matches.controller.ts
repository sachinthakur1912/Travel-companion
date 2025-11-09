import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Post()
  async createMatch(
    @GetUser() user: User,
    @Body() body: { requestedToId: string },
  ) {
    return this.matchesService.createMatch(user.id, body.requestedToId);
  }

  @Get()
  async getMatches(@GetUser() user: User) {
    return this.matchesService.getMatches(user.id);
  }

  @Get('accepted')
  async getAcceptedMatches(@GetUser() user: User) {
    return this.matchesService.getAcceptedMatches(user.id);
  }

  @Get('pending')
  async getPendingMatches(@GetUser() user: User) {
    return this.matchesService.getPendingMatches(user.id);
  }

  @Put(':id/accept')
  async acceptMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.matchesService.acceptMatch(id, user.id);
  }

  @Put(':id/reject')
  async rejectMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.matchesService.rejectMatch(id, user.id);
  }
}

