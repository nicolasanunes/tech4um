import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ListUserDto } from './dtos/list-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoginPayloadDto } from '../auth/dtos/login-payload.dto';
import { UsersAvatarUploadService } from './users-avatar-upload.service';

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersAvatarUploadService: UsersAvatarUploadService,
  ) {}

  @Post()
  @ResponseMessage('Usuario criado com sucesso')
  async create(@Body() createUserDto: CreateUserDto): Promise<ListUserDto> {
    return this.usersService.createUser(createUserDto);
  }

  @Patch('me/avatar')
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
  @ResponseMessage('Avatar atualizado com sucesso')
  async updateAvatar(
    @Req() request: Request & { user: LoginPayloadDto },
    @UploadedFile() file: UploadedImageFile | undefined,
  ): Promise<ListUserDto> {
    if (!file) {
      throw new BadRequestException('Selecione uma imagem valida de ate 5MB');
    }

    const userId = Number(request.user.id);
    const currentUser = await this.usersService.listUserById(userId);

    const avatarUrl = await this.usersAvatarUploadService.uploadAvatar(
      file,
      userId,
    );

    const updatedUser = await this.usersService.updateAvatarByUserId(
      userId,
      { avatarUrl },
    );

    const previousAvatarUrl = currentUser?.avatarUrl?.trim();
    if (previousAvatarUrl && previousAvatarUrl !== avatarUrl) {
      await this.usersAvatarUploadService.deleteAvatarByUrl(previousAvatarUrl);
    }

    return updatedUser;
  }
}
