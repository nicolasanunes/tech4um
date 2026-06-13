import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    createUser: jest.Mock;
    updateAvatarByUserId: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      createUser: jest.fn(),
      updateAvatarByUserId: jest.fn(),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates user creation to service', async () => {
    const dto = {
      username: 'alice',
      email: 'alice@mail.com',
      password: 'secret123',
    };
    usersService.createUser.mockResolvedValueOnce({
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: null,
    });

    const result = await controller.create(dto);

    expect(usersService.createUser).toHaveBeenCalledWith(dto);
    expect(result.username).toBe('alice');
  });

  it('delegates avatar update to service with numeric user id', async () => {
    const request = { user: { id: '11' } } as any;
    const dto = { avatarUrl: 'avatar.png' };
    usersService.updateAvatarByUserId.mockResolvedValueOnce({
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: 'avatar.png',
    });

    const result = await controller.updateAvatar(request, dto);

    expect(usersService.updateAvatarByUserId).toHaveBeenCalledWith(11, dto);
    expect(result.avatarUrl).toBe('avatar.png');
  });
});
