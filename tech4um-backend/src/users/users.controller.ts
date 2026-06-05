import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ListUserDto } from './dtos/list-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ResponseMessage('Usuario criado com sucesso')
  async create(@Body() createUserDto: CreateUserDto): Promise<ListUserDto> {
    return this.usersService.createUser(createUserDto);
  }
}
