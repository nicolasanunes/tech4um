import { ForumsService } from './forums.service';

describe('ForumsService', () => {
  let service: ForumsService;
  let usersRepository: {
    findBy: jest.Mock;
  };

  beforeEach(() => {
    usersRepository = {
      findBy: jest.fn(),
    };

    service = new ForumsService(
      {} as any,
      usersRepository as any,
      {} as any,
      {} as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns empty array when no ids are provided', async () => {
    const result = await service.listUsersBasicByIds([]);

    expect(result).toEqual([]);
    expect(usersRepository.findBy).not.toHaveBeenCalled();
  });

  it('maps users list to basic payload', async () => {
    usersRepository.findBy.mockResolvedValueOnce([
      { id: 1, username: 'alice', avatarUrl: null },
      { id: 2, username: 'bob', avatarUrl: 'avatar.png' },
    ]);

    const result = await service.listUsersBasicByIds([1, 2]);

    expect(usersRepository.findBy).toHaveBeenCalled();
    expect(result).toEqual([
      { id: 1, username: 'alice', avatarUrl: null },
      { id: 2, username: 'bob', avatarUrl: 'avatar.png' },
    ]);
  });

  it('resolves supported sorting strategy values', () => {
    expect((service as any).resolveListForumsOrderBy('date_desc')).toBe(
      'f."createdAt" DESC, f.id DESC',
    );
    expect((service as any).resolveListForumsOrderBy('messages_asc')).toBe(
      '"messagesCount" ASC, f."createdAt" ASC, f.id ASC',
    );
    expect((service as any).resolveListForumsOrderBy('participants_desc')).toBe(
      '"participantsCount" DESC, f."createdAt" DESC, f.id DESC',
    );
  });
});
