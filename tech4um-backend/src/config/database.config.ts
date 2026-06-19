import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const createDatabaseConfig = (): TypeOrmModuleOptions => {
  const shouldLog = process.env.TYPEORM_LOGGING === 'true';
  const useSsl = process.env.DB_SSL === 'true';
  const rawHost = process.env.DB_HOST?.trim();
  const isLocalDev = (process.env.NODE_ENV ?? 'development') !== 'production';
  const host = isLocalDev && rawHost === 'tech4um-db' ? 'localhost' : rawHost;

  return {
    type: 'postgres',
    host,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    // Force pg to always receive a primitive string password.
    password: String(process.env.DB_PASSWORD ?? ''),
    database: process.env.DB_DATABASE,
    autoLoadEntities: true,
    synchronize: false,
    migrations: ['dist/database/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    logging: shouldLog,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  };
};

export const databaseConfig: TypeOrmModuleOptions = createDatabaseConfig();
