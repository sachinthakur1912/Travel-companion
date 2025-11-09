import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post()
  async create(@GetUser() user: User, @Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(user.id, createGroupDto);
  }

  @Get()
  async findAll() {
    return this.groupsService.findAll();
  }

  @Get('my-groups')
  async getMyGroups(@GetUser() user: User) {
    return this.groupsService.getMyGroups(user.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, user.id, updateGroupDto);
  }

  @Post(':id/request-join')
  async requestJoin(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.groupsService.requestJoin(id, user.id);
  }

  @Get(':id/pending-requests')
  async getPendingRequests(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.groupsService.getPendingRequests(id, user.id);
  }

  @Put(':groupId/members/:memberId/approve')
  async approveMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetUser() user: User,
  ) {
    return this.groupsService.approveMember(groupId, memberId, user.id);
  }

  @Put(':groupId/members/:memberId/reject')
  async rejectMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetUser() user: User,
  ) {
    return this.groupsService.rejectMember(groupId, memberId, user.id);
  }

  @Delete(':id/leave')
  async leaveGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.groupsService.leaveGroup(id, user.id);
  }
}

