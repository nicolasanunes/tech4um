import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ListUserDto } from './dtos/list-user.dto';
import { UpdateUserAvatarDto } from './dtos/update-user-avatar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoginPayloadDto } from '../auth/dtos/login-payload.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ResponseMessage('Usuario criado com sucesso')
  async create(@Body() createUserDto: CreateUserDto): Promise<ListUserDto> {
    return this.usersService.createUser(createUserDto);
  }

  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Avatar atualizado com sucesso')
  async updateAvatar(
    @Req() request: Request & { user: LoginPayloadDto },
    @Body() updateUserAvatarDto: UpdateUserAvatarDto,
  ): Promise<ListUserDto> {
    return this.usersService.updateAvatarByUserId(
      Number(request.user.id),
      updateUserAvatarDto,
    );
  }
}
