import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards, 
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ForumsService } from './forums.service'; 
import { CreateForumDto } from './dtos/create-forum.dto';
import { LoginPayloadDto } from '../auth/dtos/login-payload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ListForumsQueryDto } from './dtos/list-forums-query.dto';
import { ForumsImageUploadService } from './forums-image-upload.service';

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller('forums')
export class ForumsController {
  constructor(
    private readonly forumsService: ForumsService,
    private readonly forumsImageUploadService: ForumsImageUploadService,
  ) {}

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
  @UseGuards(OptionalJwtAuthGuard)
  @ResponseMessage('Forums listados com sucesso')
  async listAllForums(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('name') name?: string,
    @Query('creatorName') creatorName?: string,
    @Query('sort') sort?: ListForumsQueryDto['sort'],
    @Req() request?: Request & { user?: LoginPayloadDto },
  ) {
    const query: ListForumsQueryDto = {
      page,
      pageSize,
      search,
      name,
      creatorName,
      sort,
    };

    const viewerUserId =
      request?.user?.id != null ? Number(request.user.id) : undefined;

    return this.forumsService.listAllForums(query, viewerUserId);
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

  @Post(':id/chat-images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_request, file, callback) => {
        callback(null, file.mimetype.startsWith('image/'));
      },
    }),
  )
  @ResponseMessage('Imagem enviada com sucesso')
  async uploadChatImage(
    @Param('id', ParseIntPipe) forumId: number,
    @UploadedFile() file: UploadedImageFile | undefined,
    @Req() request: Request & { user: LoginPayloadDto },
  ) {
    if (!file) {
      throw new BadRequestException('Selecione uma imagem valida de ate 5MB');
    }

    await this.forumsService.ensureForumParticipant(forumId, Number(request.user.id));

    const imageUrl = await this.forumsImageUploadService.uploadChatImage(
      file,
      forumId,
      Number(request.user.id),
    );

    return { imageUrl };
  }
}
