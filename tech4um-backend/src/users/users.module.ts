import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
