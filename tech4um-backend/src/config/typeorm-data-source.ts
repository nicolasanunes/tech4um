import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Forum } from '../forums/entities/forum.entity';
import { ForumParticipant } from '../forums/entities/forum-participant.entity';
import { Message } from '../messages/entities/message.entity';

const shouldLog = process.env.TYPEORM_LOGGING === 'true';
const useSsl = process.env.DB_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, Forum, ForumParticipant, Message],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: shouldLog,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
