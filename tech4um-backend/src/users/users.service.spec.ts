import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { hash } from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    service = new UsersService(userRepository as any);
    (hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates user with hashed password and maps response', async () => {
    const dto = {
      username: 'alice',
      email: 'alice@mail.com',
      password: 'plain-password',
    };

    userRepository.create.mockReturnValueOnce({
      ...dto,
      password: 'hashed-password',
    });
    userRepository.save.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: null,
      password: 'hashed-password',
    });

    const result = await service.createUser(dto);

    expect(hash).toHaveBeenCalledWith('plain-password', 10);
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed-password' }),
    );
    expect(result).toEqual({
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: null,
    });
  });

  it('throws conflict when username already exists', async () => {
    userRepository.create.mockReturnValueOnce({});
    userRepository.save.mockRejectedValueOnce({
      code: '23505',
      constraint: 'users_username_key',
    });

    await expect(
      service.createUser({
        username: 'alice',
        email: 'alice@mail.com',
        password: 'plain-password',
      }),
    ).rejects.toThrow(new ConflictException('Usuario ja existe'));
  });

  it('throws generic conflict for duplicated records without username constraint', async () => {
    userRepository.create.mockReturnValueOnce({});
    userRepository.save.mockRejectedValueOnce({
      code: '23505',
      constraint: 'users_email_key',
    });

    await expect(
      service.createUser({
        username: 'alice',
        email: 'alice@mail.com',
        password: 'plain-password',
      }),
    ).rejects.toThrow(new ConflictException('Registro ja existente'));
  });

  it('throws not found when updating avatar of unknown user', async () => {
    userRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.updateAvatarByUserId(1, { avatarUrl: 'avatar.png' }),
    ).rejects.toThrow(new NotFoundException('Usuario nao encontrado'));
  });

  it('updates avatar and maps response', async () => {
    userRepository.findOne.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: null,
    });
    userRepository.save.mockResolvedValueOnce({
      id: 1,
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: 'avatar.png',
    });

    const result = await service.updateAvatarByUserId(1, {
      avatarUrl: 'avatar.png',
    });

    expect(result).toEqual({
      username: 'alice',
      email: 'alice@mail.com',
      avatarUrl: 'avatar.png',
    });
  });
});
