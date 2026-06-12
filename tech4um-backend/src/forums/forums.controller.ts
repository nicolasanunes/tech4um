import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards, 
} from '@nestjs/common';
import { Request } from 'express';
import { ForumsService } from './forums.service'; 
import { CreateForumDto } from './dtos/create-forum.dto';
import { LoginPayloadDto } from '../auth/dtos/login-payload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ListForumsQueryDto } from './dtos/list-forums-query.dto';

@Controller('forums')
export class ForumsController {
  constructor(private readonly forumsService: ForumsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Forum criado com sucesso')
  async createForum(
    @Body() createForumDto: CreateForumDto,
    @Req() request: Request & { user: LoginPayloadDto },
  ) {
    return this.forumsService.createForum(createForumDto, Number(request.user.id));
  }

  @Get()
  @ResponseMessage('Forums listados com sucesso')
  async listAllForums(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('name') name?: string,
    @Query('creatorName') creatorName?: string,
    @Query('sort') sort?: ListForumsQueryDto['sort'],
  ) {
    const query: ListForumsQueryDto = {
      page,
      pageSize,
      search,
      name,
      creatorName,
      sort,
    };

    return this.forumsService.listAllForums(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Forum encontrado com sucesso')
  async listForumById(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: LoginPayloadDto },
  ) {
    return this.forumsService.listForumById(id, Number(request.user.id));
  }

  @Get(':id/sidebar')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Sidebar de forums carregada com sucesso')
  async listForumSidebar(
    @Param('id', ParseIntPipe) id: number,
    @Query('count', new DefaultValuePipe(5), ParseIntPipe) count: number,
  ) {
    return this.forumsService.listForumSidebar(id, count);
  }
}
