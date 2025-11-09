import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GroupMember } from './group-member.entity';
import { User } from './user.entity';
import { Chat } from './chat.entity';

export enum GroupStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FULL = 'full',
}

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  destination: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: 10 })
  maxMembers: number;

  @Column({ default: 0 })
  currentMembers: number;

  @Column({
    type: 'enum',
    enum: GroupStatus,
    default: GroupStatus.ACTIVE,
  })
  status: GroupStatus;

  @Column()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  coverPhoto: string;

  @OneToMany(() => GroupMember, (groupMember) => groupMember.group)
  members: GroupMember[];

  @OneToMany(() => Chat, (chat) => chat.group)
  chats: Chat[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

