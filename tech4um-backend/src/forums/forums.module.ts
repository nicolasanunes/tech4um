import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ForumsService } from './forums.service';
import { ForumsController } from './forums.controller';
import { Forum } from './entities/forum.entity';
import { ForumParticipant } from './entities/forum-participant.entity';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForumsGateway } from './forums.gateway';
import { Message } from '../messages/entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Forum, ForumParticipant, User, Message]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
    }),
  ],
  controllers: [ForumsController],
  providers: [ForumsService, JwtAuthGuard, ForumsGateway],
})
export class ForumsModule {}
 