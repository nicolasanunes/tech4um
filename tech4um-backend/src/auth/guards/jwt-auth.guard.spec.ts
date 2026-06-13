import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    guard = new JwtAuthGuard(jwtService as unknown as JwtService);
  });

  it('throws when access token is missing', async () => {
    const context = createContext({ cookies: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Usuario nao autenticado'),
    );
  });

  it('throws when token verification fails', async () => {
    const context = createContext({ cookies: { accessToken: 'bad-token' } });
    jwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token invalido ou expirado'),
    );
  });

  it('throws when token type is not access', async () => {
    const context = createContext({ cookies: { accessToken: 'refresh-token' } });
    jwtService.verifyAsync.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      tokenType: 'refresh',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token invalido ou expirado'),
    );
  });

  it('attaches payload and returns true for valid access token', async () => {
    const request: Record<string, unknown> = {
      cookies: { accessToken: 'access-token' },
    };
    const context = createContext(request);

    jwtService.verifyAsync.mockResolvedValueOnce({
      id: 10,
      username: 'alice',
      email: 'alice@mail.com',
      tokenType: 'access',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as any).user).toEqual(
      expect.objectContaining({ id: 10, tokenType: 'access' }),
    );
  });
});
