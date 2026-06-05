import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
  Column,
} from 'typeorm';

import { Forum } from './forum.entity';
import { User } from '../../users/entities/user.entity';

@Entity('forum_participants')
@Unique(['forum', 'user'])
export class ForumParticipant {
    @PrimaryGeneratedColumn()
    declare id: number;

    @ManyToOne(() => Forum, (forum) => forum.participants, {
    nullable: false,
    onDelete: 'CASCADE',
    })
    declare forum: Forum;

    @ManyToOne(() => User, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
    })
    declare user: User;

    @CreateDateColumn()
    declare firstInteraction: Date;

    @Column({
    type: 'timestamp',
    nullable: true,
    })
    declare lastInteraction?: Date;
}
 