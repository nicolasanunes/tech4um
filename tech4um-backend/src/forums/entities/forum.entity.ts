import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { ForumParticipant } from './forum-participant.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('forums')
export class Forum {
  @PrimaryGeneratedColumn('increment', { name: 'id', type: 'bigint' })
  declare id: number;
 
  @Column({
    unique: true,
    length: 255,
  })
  declare name: string;
  
  @Column({
    type: 'text',
    nullable: true,
  })
  declare description?: string;

  @ManyToOne(() => User, (user) => user.forumsCreated, {
    nullable: false,
    eager: true,
  })
  declare creator: User;
 
  @OneToMany(() => Message, (message) => message.forum)
  declare messages: Message[];

  @OneToMany(() => ForumParticipant, (participant) => participant.forum)
  declare participants: ForumParticipant[];

  @Column({
    default: 1,
  })
  declare participantsCount: number;

  @Column({
    default: 0,
  })
  declare messagesCount: number;

  @CreateDateColumn()
  declare createdAt: Date;

  @UpdateDateColumn()
  declare updatedAt: Date;
}
 