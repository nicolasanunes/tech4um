import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    guard = new OptionalJwtAuthGuard(jwtService as unknown as JwtService);
  });

  it('returns true and leaves user undefined when token is missing', async () => {
    const request: Record<string, unknown> = { cookies: {} };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as any).user).toBeUndefined();
  });

  it('returns true and leaves user undefined when token is invalid', async () => {
    const request: Record<string, unknown> = { cookies: { accessToken: 'bad' } };
    const context = createContext(request);
    jwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid token'));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as any).user).toBeUndefined();
  });

  it('returns true and ignores non-access tokens', async () => {
    const request: Record<string, unknown> = {
      cookies: { accessToken: 'refresh-token' },
    };
    const context = createContext(request);

    jwtService.verifyAsync.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      tokenType: 'refresh',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as any).user).toBeUndefined();
  });

  it('returns true and attaches user when token is valid access token', async () => {
    const request: Record<string, unknown> = {
      cookies: { accessToken: 'access-token' },
    };
    const context = createContext(request);

    jwtService.verifyAsync.mockResolvedValueOnce({
      id: 2,
      username: 'alice',
      email: 'alice@mail.com',
      tokenType: 'access',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as any).user).toEqual(
      expect.objectContaining({ id: 2, tokenType: 'access' }),
    );
  });
});
