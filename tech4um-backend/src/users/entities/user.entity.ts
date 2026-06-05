import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

import { Forum } from '../../forums/entities/forum.entity';
import { ForumParticipant } from '../../forums/entities/forum-participant.entity';
import { Message } from '../../messages/entities/message.entity';
 
@Entity('users')
export class User {
    @PrimaryGeneratedColumn('increment', { name: 'id',type: 'bigint' })
    declare id: number;

    @Column({ name: 'username', type: 'varchar', length: 255, unique: true, nullable: false })
    declare username: string;

    @Column({ name: 'email', type: 'varchar', length: 255, nullable: false })
    declare email: string;

    @Column({ name: 'password', type: 'varchar', length: 255, nullable: false })
    declare password: string;

    @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
    declare avatarUrl: string;

    @CreateDateColumn({ name: 'created_at'})
    declare createdAt: Date;

    @OneToMany(
    () => Forum,
    (forum) => forum.creator,
    )
    declare forumsCreated: Forum[];

    @OneToMany(
    () => Message,
    (message) => message.author,
    ) 
    declare messages: Message[];

    @OneToMany(
    () => ForumParticipant,
    (participant) => participant.user,
    )
    declare participations: ForumParticipant[];
}