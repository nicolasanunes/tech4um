import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { setAccessTokenCookie, setRefreshTokenCookie } from '../utils/cookies';
import { validatePassword } from '../utils/password';

jest.mock('../utils/cookies', () => ({
  setAccessTokenCookie: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
}));

jest.mock('../utils/password', () => ({
  validatePassword: jest.fn(),
}));

type MockUsersService = {
  listUserByUsername: jest.Mock;
  listUserById: jest.Mock;
};

type MockJwtService = {
  signAsync: jest.Mock;
  verifyAsync: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: MockUsersService;
  let jwtService: MockJwtService;

  const mockedSetAccessTokenCookie = setAccessTokenCookie as jest.Mock;
  const mockedSetRefreshTokenCookie = setRefreshTokenCookie as jest.Mock;
  const mockedValidatePassword = validatePassword as jest.Mock;

  const mockResponse = {
    clearCookie: jest.fn(),
  } as any;

  beforeEach(() => {
    usersService = {
      listUserByUsername: jest.fn(),
      listUserById: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    service = new AuthService(usersService as any, jwtService as any);

    mockedSetAccessTokenCookie.mockReset();
    mockedSetRefreshTokenCookie.mockReset();
    mockedValidatePassword.mockReset();
    mockResponse.clearCookie.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws unauthorized when user does not exist on login', async () => {
    usersService.listUserByUsername.mockResolvedValueOnce(null);

    await expect(
      service.login({ username: 'alice', password: '123456' }, mockResponse),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws unauthorized when password is invalid on login', async () => {
    usersService.listUserByUsername.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      password: 'hashed',
      avatarUrl: null,
    });
    mockedValidatePassword.mockResolvedValueOnce(false);

    await expect(
      service.login({ username: 'alice', password: 'wrong-pass' }, mockResponse),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logs in and sets both auth cookies', async () => {
    usersService.listUserByUsername.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      password: 'hashed',
      avatarUrl: null,
    });
    mockedValidatePassword.mockResolvedValueOnce(true);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login(
      { username: 'alice', password: 'valid-pass' },
      mockResponse,
    );

    expect(result).toEqual({
      user: {
        username: 'alice',
        email: 'alice@mail.com',
        avatarUrl: null,
      },
    });

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ tokenType: 'access' }),
      expect.objectContaining({ expiresIn: '15m' }),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tokenType: 'refresh' }),
      expect.objectContaining({ expiresIn: '7d' }),
    );
    expect(mockedSetAccessTokenCookie).toHaveBeenCalledWith(
      mockResponse,
      'access-token',
    );
    expect(mockedSetRefreshTokenCookie).toHaveBeenCalledWith(
      mockResponse,
      'refresh-token',
    );
  });

  it('clears access and refresh cookies on logout', async () => {
    const result = await service.logout(mockResponse);

    expect(result).toBeNull();
    expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.objectContaining({ path: '/' }),
    );
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ path: '/' }),
    );
  });

  it('returns authenticated user in me', async () => {
    usersService.listUserById.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: 'avatar.png',
    });

    const result = await service.me(1);

    expect(result).toEqual({
      user: {
        username: 'alice',
        email: 'alice@mail.com',
        avatarUrl: 'avatar.png',
      },
    });
  });

  it('throws unauthorized in me when user is missing', async () => {
    usersService.listUserById.mockResolvedValueOnce(null);

    await expect(service.me(1)).rejects.toThrow(UnauthorizedException);
  });

  it('throws unauthorized in refresh when refreshToken is missing', async () => {
    await expect(
      service.refresh({ cookies: {} } as any, mockResponse),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws unauthorized in refresh when token type is not refresh', async () => {
    jwtService.verifyAsync.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      tokenType: 'access',
    });

    await expect(
      service.refresh({ cookies: { refreshToken: 'token' } } as any, mockResponse),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refreshes tokens when refresh token is valid', async () => {
    jwtService.verifyAsync.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      tokenType: 'refresh',
    });
    usersService.listUserById.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: null,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh');

    const result = await service.refresh(
      { cookies: { refreshToken: 'valid-token' } } as any,
      mockResponse,
    );

    expect(result.user.username).toBe('alice');
    expect(mockedSetAccessTokenCookie).toHaveBeenCalledWith(
      mockResponse,
      'new-access',
    );
    expect(mockedSetRefreshTokenCookie).toHaveBeenCalledWith(
      mockResponse,
      'new-refresh',
    );
  });
});
