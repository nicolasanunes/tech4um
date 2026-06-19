import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { createDatabaseConfig } from './config/database.config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ForumsModule } from './forums/forums.module';
import { MessagesModule } from './messages/messages.module';
 
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
 
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),

    TypeOrmModule.forRootAsync({
      useFactory: () => createDatabaseConfig(),
    }),

    UsersModule, 
    AuthModule,
    ForumsModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
