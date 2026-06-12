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

    @Column({
    name: 'image_url',
    type: 'text',
    nullable: true,
    })
    declare imageUrl: string | null;

    @Column({
    name: 'is_private',
    type: 'boolean',
    default: false,
    })
    declare isPrivate: boolean;

    @ManyToOne(() => User, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
    })
    declare recipient: User | null;

    @CreateDateColumn()
    declare createdAt: Date;
}
 