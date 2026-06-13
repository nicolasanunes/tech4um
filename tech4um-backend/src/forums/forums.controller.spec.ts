import { Test, TestingModule } from '@nestjs/testing';
import { ForumsController } from './forums.controller';
import { ForumsService } from './forums.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

describe('ForumsController', () => {
  let controller: ForumsController;
  let forumsService: {
    createForum: jest.Mock;
    listAllForums: jest.Mock;
    listForumById: jest.Mock;
    listForumSidebar: jest.Mock;
  };

  beforeEach(async () => {
    forumsService = {
      createForum: jest.fn(),
      listAllForums: jest.fn(),
      listForumById: jest.fn(),
      listForumSidebar: jest.fn(),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [ForumsController],
      providers: [
        {
          provide: ForumsService,
          useValue: forumsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<ForumsController>(ForumsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates forum creation with numeric user id', async () => {
    const dto = { name: 'Forum test', description: 'desc' };
    const request = { user: { id: '9' } } as any;
    forumsService.createForum.mockResolvedValueOnce({ name: 'Forum test' });

    const result = await controller.createForum(dto, request);

    expect(forumsService.createForum).toHaveBeenCalledWith(dto, 9);
    expect(result).toEqual({ name: 'Forum test' });
  });

  it('maps listAllForums query and viewer user id', async () => {
    const request = { user: { id: '7' } } as any;
    forumsService.listAllForums.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    });

    await controller.listAllForums(
      1,
      10,
      'abc',
      'name',
      'creator',
      'date_desc',
      request,
    );

    expect(forumsService.listAllForums).toHaveBeenCalledWith(
      {
        page: 1,
        pageSize: 10,
        search: 'abc',
        name: 'name',
        creatorName: 'creator',
        sort: 'date_desc',
      },
      7,
    );
  });

  it('passes undefined viewer id when request user is missing', async () => {
    forumsService.listAllForums.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    });

    await controller.listAllForums(1, 10, undefined, undefined, undefined, undefined, undefined);

    expect(forumsService.listAllForums).toHaveBeenCalledWith(
      {
        page: 1,
        pageSize: 10,
        search: undefined,
        name: undefined,
        creatorName: undefined,
        sort: undefined,
      },
      undefined,
    );
  });

  it('delegates forum by id and sidebar requests', async () => {
    forumsService.listForumById.mockResolvedValueOnce({ id: 5 });
    forumsService.listForumSidebar.mockResolvedValueOnce([{ id: 5 }]);

    const forum = await controller.listForumById(5, { user: { id: '3' } } as any);
    const sidebar = await controller.listForumSidebar(5, 7);

    expect(forumsService.listForumById).toHaveBeenCalledWith(5, 3);
    expect(forumsService.listForumSidebar).toHaveBeenCalledWith(5, 7);
    expect(forum).toEqual({ id: 5 });
    expect(sidebar).toEqual([{ id: 5 }]);
  });
});
