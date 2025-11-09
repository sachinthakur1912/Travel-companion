import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
} from 'typeorm';
import { Trip } from './trip.entity';
import { Match } from './match.entity';
import { GroupMember } from './group-member.entity';
import { Chat } from './chat.entity';
import { Message } from './message.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ type: 'simple-array', nullable: true })
  photos: string[];

  @Column({ nullable: true })
  profilePhoto: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ type: 'simple-array', nullable: true })
  travelPreferences: string[];

  @Column({
    type: 'enum',
    enum: ProfileVisibility,
    default: ProfileVisibility.PUBLIC,
  })
  profileVisibility: ProfileVisibility;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  refreshToken: string;

  @OneToMany(() => Trip, (trip) => trip.user)
  trips: Trip[];

  @OneToMany(() => Match, (match) => match.requestedBy)
  sentMatches: Match[];

  @OneToMany(() => Match, (match) => match.requestedTo)
  receivedMatches: Match[];

  @OneToMany(() => GroupMember, (groupMember) => groupMember.user)
  groupMemberships: GroupMember[];

  @OneToMany(() => Chat, (chat) => chat.user1)
  chatsAsUser1: Chat[];

  @OneToMany(() => Chat, (chat) => chat.user2)
  chatsAsUser2: Chat[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

