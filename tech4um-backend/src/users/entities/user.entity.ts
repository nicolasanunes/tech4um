import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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

    @UpdateDateColumn({ name: 'updated_at'})
    declare updatedAt: Date;
}