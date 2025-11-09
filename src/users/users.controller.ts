import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async getMyProfile(@GetUser() user: User) {
    const { password, refreshToken, ...result } = user;
    return result;
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    const { password, refreshToken, ...result } = user;
    return result;
  }

  @Put('me')
  async updateProfile(
    @GetUser() user: User,
    @Body() updateData: Partial<User>,
  ) {
    return this.usersService.updateProfile(user.id, updateData);
  }

  @Delete('me')
  async deleteAccount(@GetUser() user: User) {
    await this.usersService.delete(user.id);
    return { message: 'Account deleted successfully' };
  }
}

