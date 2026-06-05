import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { LoginPayloadDto } from '../dtos/login-payload.dto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: LoginPayloadDto }>();
    const token = request.cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedException('Usuario nao autenticado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<LoginPayloadDto>(token, {
        secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
      });

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado');
    }
  }
}
