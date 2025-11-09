import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group, GroupStatus } from '../entities/group.entity';
import { GroupMember, MemberStatus } from '../entities/group-member.entity';
import { Chat, ChatType } from '../entities/chat.entity';
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {}

  async create(userId: string, createGroupDto: CreateGroupDto): Promise<Group> {
    const group = this.groupRepository.create({
      ...createGroupDto,
      createdById: userId,
      startDate: new Date(createGroupDto.startDate),
      endDate: new Date(createGroupDto.endDate),
      currentMembers: 1,
      maxMembers: createGroupDto.maxMembers || 10,
    });

    const savedGroup = await this.groupRepository.save(group);

    // Add creator as member
    const member = this.groupMemberRepository.create({
      groupId: savedGroup.id,
      userId,
      status: MemberStatus.ACCEPTED,
    });
    await this.groupMemberRepository.save(member);

    // Create group chat
    const chat = this.chatRepository.create({
      type: ChatType.GROUP,
      groupId: savedGroup.id,
    });
    await this.chatRepository.save(chat);

    return savedGroup;
  }

  async findAll(): Promise<Group[]> {
    return this.groupRepository.find({
      relations: ['createdBy', 'members', 'members.user'],
      where: { status: GroupStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['createdBy', 'members', 'members.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async update(
    id: string,
    userId: string,
    updateGroupDto: UpdateGroupDto,
  ): Promise<Group> {
    const group = await this.findOne(id);

    if (group.createdById !== userId) {
      throw new ForbiddenException('Only group creator can update the group');
    }

    if (updateGroupDto.startDate) {
      group.startDate = new Date(updateGroupDto.startDate);
    }
    if (updateGroupDto.endDate) {
      group.endDate = new Date(updateGroupDto.endDate);
    }

    Object.assign(group, updateGroupDto);
    return this.groupRepository.save(group);
  }

  async requestJoin(groupId: string, userId: string) {
    const group = await this.findOne(groupId);

    if (group.currentMembers >= group.maxMembers) {
      throw new BadRequestException('Group is full');
    }

    const existingMember = await this.groupMemberRepository.findOne({
      where: { groupId, userId },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member or have a pending request');
    }

    const member = this.groupMemberRepository.create({
      groupId,
      userId,
      status: MemberStatus.PENDING,
    });

    return this.groupMemberRepository.save(member);
  }

  async approveMember(groupId: string, memberId: string, userId: string) {
    const group = await this.findOne(groupId);

    if (group.createdById !== userId) {
      throw new ForbiddenException('Only group creator can approve members');
    }

    if (group.currentMembers >= group.maxMembers) {
      throw new BadRequestException('Group is full');
    }

    const member = await this.groupMemberRepository.findOne({
      where: { id: memberId, groupId },
    });

    if (!member) {
      throw new NotFoundException('Member request not found');
    }

    member.status = MemberStatus.ACCEPTED;
    await this.groupMemberRepository.save(member);

    group.currentMembers += 1;
    if (group.currentMembers >= group.maxMembers) {
      group.status = GroupStatus.FULL;
    }
    await this.groupRepository.save(group);

    return member;
  }

  async rejectMember(groupId: string, memberId: string, userId: string) {
    const group = await this.findOne(groupId);

    if (group.createdById !== userId) {
      throw new ForbiddenException('Only group creator can reject members');
    }

    const member = await this.groupMemberRepository.findOne({
      where: { id: memberId, groupId },
    });

    if (!member) {
      throw new NotFoundException('Member request not found');
    }

    member.status = MemberStatus.REJECTED;
    return this.groupMemberRepository.save(member);
  }

  async getMyGroups(userId: string): Promise<Group[]> {
    const memberships = await this.groupMemberRepository.find({
      where: { userId, status: MemberStatus.ACCEPTED },
      relations: ['group', 'group.createdBy'],
    });

    return memberships.map((m) => m.group);
  }

  async getPendingRequests(groupId: string, userId: string) {
    const group = await this.findOne(groupId);

    if (group.createdById !== userId) {
      throw new ForbiddenException('Only group creator can view pending requests');
    }

    return this.groupMemberRepository.find({
      where: { groupId, status: MemberStatus.PENDING },
      relations: ['user'],
    });
  }

  async leaveGroup(groupId: string, userId: string) {
    const group = await this.findOne(groupId);

    if (group.createdById === userId) {
      throw new BadRequestException('Group creator cannot leave the group');
    }

    const member = await this.groupMemberRepository.findOne({
      where: { groupId, userId, status: MemberStatus.ACCEPTED },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this group');
    }

    await this.groupMemberRepository.remove(member);

    group.currentMembers -= 1;
    if (group.status === GroupStatus.FULL) {
      group.status = GroupStatus.ACTIVE;
    }
    await this.groupRepository.save(group);

    return { message: 'Left group successfully' };
  }
}

