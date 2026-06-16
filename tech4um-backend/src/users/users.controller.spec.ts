import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersAvatarUploadService } from './users-avatar-upload.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    createUser: jest.Mock;
    listUserById: jest.Mock;
    updateAvatarByUserId: jest.Mock;
  };
  let usersAvatarUploadService: {
    uploadAvatar: jest.Mock;
    deleteAvatarByUrl: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      createUser: jest.fn(),
      listUserById: jest.fn(),
      updateAvatarByUserId: jest.fn(),
    };
    usersAvatarUploadService = {
      uploadAvatar: jest.fn(),
      deleteAvatarByUrl: jest.fn(),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: UsersAvatarUploadService,
          useValue: usersAvatarUploadService,
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
    const file = {
      buffer: Buffer.from('avatar-image-bytes'),
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: 18,
    };

    usersService.listUserById.mockResolvedValueOnce({
      id: 11,
      avatarUrl: 'https://bucket.s3.sa-east-1.amazonaws.com/users/11/avatar/old.png',
    });
    usersAvatarUploadService.uploadAvatar.mockResolvedValueOnce('avatar.png');
    usersService.updateAvatarByUserId.mockResolvedValueOnce({
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: 'avatar.png',
    });

    const result = await controller.updateAvatar(request, file);

    expect(usersService.listUserById).toHaveBeenCalledWith(11);
    expect(usersAvatarUploadService.uploadAvatar).toHaveBeenCalledWith(file, 11);
    expect(usersService.updateAvatarByUserId).toHaveBeenCalledWith(11, {
      avatarUrl: 'avatar.png',
    });
    expect(usersAvatarUploadService.deleteAvatarByUrl).toHaveBeenCalledWith(
      'https://bucket.s3.sa-east-1.amazonaws.com/users/11/avatar/old.png',
    );
    expect(result.avatarUrl).toBe('avatar.png');
  });

  it('does not delete previous avatar when user had no old avatar', async () => {
    const request = { user: { id: '12' } } as any;
    const file = {
      buffer: Buffer.from('avatar-image-bytes'),
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: 18,
    };

    usersService.listUserById.mockResolvedValueOnce({ id: 12, avatarUrl: null });
    usersAvatarUploadService.uploadAvatar.mockResolvedValueOnce('avatar-12.png');
    usersService.updateAvatarByUserId.mockResolvedValueOnce({
      username: 'bob',
      email: 'bob@mail.com',
      avatarUrl: 'avatar-12.png',
    });

    await controller.updateAvatar(request, file);

    expect(usersAvatarUploadService.deleteAvatarByUrl).not.toHaveBeenCalled();
  });
});
