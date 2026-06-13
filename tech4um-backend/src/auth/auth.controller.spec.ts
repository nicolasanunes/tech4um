import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    logout: jest.Mock;
    refresh: jest.Mock;
    me: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      logout: jest.fn(),
      refresh: jest.fn(),
      me: jest.fn(),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates login to service', async () => {
    const dto: LoginDto = { username: 'alice', password: 'secret123' };
    const response = {} as any;
    authService.login.mockResolvedValueOnce({ user: { username: 'alice' } });

    const result = await controller.login(dto, response);

    expect(authService.login).toHaveBeenCalledWith(dto, response);
    expect(result).toEqual({ user: { username: 'alice' } });
  });

  it('delegates logout to service', async () => {
    const response = {} as any;
    authService.logout.mockResolvedValueOnce(null);

    const result = await controller.logout(response);

    expect(authService.logout).toHaveBeenCalledWith(response);
    expect(result).toBeNull();
  });

  it('delegates refresh to service', async () => {
    const request = { cookies: { refreshToken: 'token' } } as any;
    const response = {} as any;
    authService.refresh.mockResolvedValueOnce({ user: { username: 'alice' } });

    const result = await controller.refresh(request, response);

    expect(authService.refresh).toHaveBeenCalledWith(request, response);
    expect(result).toEqual({ user: { username: 'alice' } });
  });

  it('converts user id and delegates me to service', async () => {
    const request = { user: { id: '12' } } as any;
    authService.me.mockResolvedValueOnce({ user: { username: 'alice' } });

    const result = await controller.me(request);

    expect(authService.me).toHaveBeenCalledWith(12);
    expect(result).toEqual({ user: { username: 'alice' } });
  });
});
