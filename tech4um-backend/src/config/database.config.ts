import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const isProduction = process.env.NODE_ENV === 'production';
const shouldSynchronize = process.env.TYPEORM_SYNCHRONIZE === 'true';
const shouldLog = process.env.TYPEORM_LOGGING === 'true';
const useSsl = process.env.DB_SSL === 'true';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  autoLoadEntities: true,
  synchronize: isProduction ? false : shouldSynchronize,
  logging: shouldLog,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
};
