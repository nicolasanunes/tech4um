import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { LoginPayloadDto } from '../dtos/login-payload.dto';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: LoginPayloadDto }>();
    const token = request.cookies?.accessToken;

    if (!token) {
      request.user = undefined;
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<LoginPayloadDto>(token);

      if (payload.tokenType !== 'access') {
        request.user = undefined;
        return true;
      }

      request.user = payload;
      return true;
    } catch {
      request.user = undefined;
      return true;
    }
  }
}
