import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { HttpStatus } from '@nestjs/common';
import { LoginResponseDto } from './dtos/login-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginPayloadDto } from './dtos/login-payload.dto';

@Controller('auth')
@SkipThrottle()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ResponseMessage('Login realizado com sucesso')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logout realizado com sucesso')
  async logout(@Res({ passthrough: true }) response: Response) {
    return this.authService.logout(response);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tokens renovados com sucesso')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    return this.authService.refresh(request, response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Usuario autenticado encontrado com sucesso')
  async me(
    @Req() request: Request & { user: LoginPayloadDto },
  ): Promise<LoginResponseDto> {
    return this.authService.me(Number(request.user.id));
  }
}
