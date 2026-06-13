import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ForumsService } from './forums.service';
import { ForumsController } from './forums.controller'; 
import { Forum } from './entities/forum.entity';
import { ForumParticipant } from './entities/forum-participant.entity';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ForumsGateway } from './forums.gateway';
import { Message } from '../messages/entities/message.entity';
 
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Forum, ForumParticipant, User, Message]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }

        return { secret };
      },
    }),
  ],
  controllers: [ForumsController],
  providers: [ForumsService, JwtAuthGuard, OptionalJwtAuthGuard, ForumsGateway],
})
export class ForumsModule {}
 