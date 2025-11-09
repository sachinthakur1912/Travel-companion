import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';
import { Message } from './message.entity';

export enum ChatType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ChatType,
    default: ChatType.DIRECT,
  })
  type: ChatType;

  @Column({ nullable: true })
  user1Id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user1Id' })
  user1: User;

  @Column({ nullable: true })
  user2Id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user2Id' })
  user2: User;

  @Column({ nullable: true })
  groupId: string;

  @ManyToOne(() => Group, (group) => group.chats, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

