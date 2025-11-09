import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum MatchStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requestedById: string;

  @ManyToOne(() => User, (user) => user.sentMatches)
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User;

  @Column()
  requestedToId: string;

  @ManyToOne(() => User, (user) => user.receivedMatches)
  @JoinColumn({ name: 'requestedToId' })
  requestedTo: User;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

