import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

import { Forum } from '../../forums/entities/forum.entity';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn()
    declare id: number;

    @ManyToOne(() => Forum, (forum) => forum.messages, {
    nullable: false,
    onDelete: 'CASCADE',
    })
    declare forum: Forum;

    @ManyToOne(() => User, (user) => user.messages, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
    })
    declare author: User;

    @Column({
    type: 'text',
    })
    declare text: string;

    @CreateDateColumn()
    declare createdAt: Date;
}
 