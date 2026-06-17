import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Forum } from './entities/forum.entity';
import { CreateForumDto } from './dtos/create-forum.dto';
import { User } from '../users/entities/user.entity';
import { ForumParticipant } from './entities/forum-participant.entity';
import { ListForumsQueryDto } from './dtos/list-forums-query.dto';
import { ListForumItemDto } from './dtos/list-forum-item.dto';
import { CreateForumResponseDto } from './dtos/create-forum-response.dto';
import { ListForumByIdResponseDto } from './dtos/list-forum-by-id-response.dto';
import { Message } from '../messages/entities/message.entity';

@Injectable() 
export class ForumsService {
	constructor(
		@InjectRepository(Forum)
		private readonly forumsRepository: Repository<Forum>,
		@InjectRepository(User)
		private readonly usersRepository: Repository<User>,
		@InjectRepository(ForumParticipant)
		private readonly participantsRepository: Repository<ForumParticipant>,
		@InjectRepository(Message)
		private readonly messagesRepository: Repository<Message>,
	) {}

	async createForum(
		createForumDto: CreateForumDto,
		creatorId: number,
	): Promise<CreateForumResponseDto> {
		try {
			const result = await this.forumsRepository.manager.transaction(
				async (manager) => {
					const usersRepository = manager.getRepository(User);
					const forumsRepository = manager.getRepository(Forum);
					const participantsRepository = manager.getRepository(ForumParticipant);

					const creator = await usersRepository.findOne({
						where: { id: creatorId },
					});

					if (!creator) {
						throw new NotFoundException('Usuario criador nao encontrado');
					}

					const forum = forumsRepository.create({
						name: createForumDto.name,
						description: createForumDto.description,
						creator,
						participantsCount: 1,
					});

					const savedForum = await forumsRepository.save(forum);

					const participant = participantsRepository.create({
						forum: savedForum,
						user: creator,
						lastInteraction: new Date(),
					});

					await participantsRepository.save(participant);

					return {
						name: savedForum.name,
						description: savedForum.description ?? null,
						creatorName: creator.username,
					};
				},
			);

			return result;
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}

			const driverError = error as {
				code?: string;
				driverError?: { code?: string; constraint?: string };
				constraint?: string;
			};

			const errorCode = driverError.code ?? driverError.driverError?.code;
			const constraintName =
				driverError.constraint ?? driverError.driverError?.constraint ?? '';

			if (errorCode === '23505' && constraintName.toLowerCase().includes('name')) {
				throw new ConflictException('Forum ja existe');
			}

			if (errorCode === '23505') {
				throw new ConflictException('Registro ja existente');
			}

			throw error;
		}
	}

	async listAllForums(query: ListForumsQueryDto, viewerUserId?: number): Promise<{
		items: ListForumItemDto[];
		page: number;
		pageSize: number;
		total: number;
	}> {
		const page = Math.max(1, Number(query.page ?? 1));
		const pageSize = Math.max(1, Math.min(Number(query.pageSize ?? 10), 100));
		const skip = (page - 1) * pageSize;
		const hasViewer = Number.isFinite(viewerUserId) && Number(viewerUserId) > 0;
		const normalizedViewerUserId = hasViewer ? Number(viewerUserId) : null;

		const baseQuery = this.forumsRepository
			.createQueryBuilder('f')
			.leftJoin('f.creator', 'c');

		const search = query.search?.trim();
		if (search) {
			baseQuery.andWhere(
				new Brackets((qb) => {
					qb.where('f.name ILIKE :search', { search: `%${search}%` })
						.orWhere('f.description ILIKE :search', { search: `%${search}%` })
						.orWhere('c.username ILIKE :search', { search: `%${search}%` });
				}),
			);
		}

		const name = query.name?.trim();
		if (name) {
			baseQuery.andWhere('f.name ILIKE :name', { name: `%${name}%` });
		}

		const creatorName = query.creatorName?.trim();
		if (creatorName) {
			baseQuery.andWhere('c.username ILIKE :creatorName', {
				creatorName: `%${creatorName}%`,
			});
		}

		const total = await baseQuery.clone().distinct(true).getCount();

		const rowsQuery = this.applyListForumsOrderBy(
			baseQuery
				.clone()
				.select('f.id', 'id')
				.addSelect('f.name', 'name')
				.addSelect('f.description', 'description')
				.addSelect('c.username', 'creatorName')
				.addSelect(
					`(
						SELECT u.username
						FROM messages lm
						JOIN users u ON u.id = lm."authorId"
						WHERE lm."forumId" = f.id
						ORDER BY lm."createdAt" DESC, lm.id DESC
						LIMIT 1
					)`,
					'lastCommentAuthorName',
				)
				.addSelect(
					`(
						SELECT COUNT(*)
						FROM messages m
						WHERE m."forumId" = f.id
						  AND m.is_private = false
					)::int`,
					'messagesCount',
				)
				.addSelect(
					`(
						SELECT COUNT(*)
						FROM forum_participants p
						WHERE p."forumId" = f.id
					)::int`,
					'participantsCount',
				)
				.addSelect('f.createdAt', 'createdAt')
				.addSelect(
					hasViewer
						? `EXISTS (
							SELECT 1
							FROM messages pm
							LEFT JOIN forum_participants fp
								ON fp."forumId" = f.id
								AND fp."userId" = :viewerUserId
							WHERE pm."forumId" = f.id
								AND pm.is_private = true
								AND pm."recipientId" = :viewerUserId
								AND pm."createdAt" > COALESCE(fp."lastReadAt", TO_TIMESTAMP(0))
						)`
						: 'false',
					'hasUnreadPrivateMessages',
				)
				.setParameter('viewerUserId', normalizedViewerUserId)
				.limit(pageSize)
				.offset(skip),
			query.sort,
		);

		const rows = await rowsQuery.getRawMany<{
			id: string;
			name: string;
			description: string | null;
			creatorName: string;
			lastCommentAuthorName: string | null;
			messagesCount: string;
			participantsCount: string;
			createdAt: string;
			hasUnreadPrivateMessages: boolean;
		}>();

		const items: ListForumItemDto[] = rows.map((row) => ({
			id: Number(row.id),
			name: row.name,
			description: row.description,
			creatorName: row.creatorName,
			lastCommentAuthorName: row.lastCommentAuthorName ?? row.creatorName,
			messagesCount: Number(row.messagesCount ?? 0),
			participantsCount: Number(row.participantsCount ?? 0),
			createdAt: new Date(row.createdAt),
			hasUnreadPrivateMessages: Boolean(row.hasUnreadPrivateMessages),
		}));

		return { items, page, pageSize, total };
	}

	async listForumById(
		id: number,
		viewerUserId?: number,
		options?: {
			limit?: number;
			beforeMessageId?: number;
		},
	): Promise<ListForumByIdResponseDto> {
		if (viewerUserId != null && Number.isFinite(viewerUserId)) {
			await this.markForumAsRead(id, Number(viewerUserId));
		}

		const forum = await this.forumsRepository.findOne({
			where: { id },
			relations: {
				creator: true,
				participants: {
					user: true,
				},
			},
		});

		if (!forum) {
			throw new NotFoundException('Forum nao encontrado');
		}
 
		const participants = forum.participants
			.slice()
			.sort((a, b) => {
				const aTime = a.lastInteraction?.getTime() ?? a.firstInteraction.getTime();
				const bTime = b.lastInteraction?.getTime() ?? b.firstInteraction.getTime();
				return bTime - aTime;
			})
			.map((participant) => ({
				id: participant.user.id,
				username: participant.user.username,
				avatarUrl: participant.user.avatarUrl ?? null,
			}));

		const limit = Math.max(1, Math.min(Number(options?.limit ?? 30), 100));
		const beforeMessageId = Number(options?.beforeMessageId ?? 0);

		const messagesQuery = this.messagesRepository
			.createQueryBuilder('message')
			.leftJoinAndSelect('message.author', 'author')
			.leftJoinAndSelect('message.recipient', 'recipient')
			.where('message."forumId" = :forumId', { forumId: id })
			.orderBy('message.id', 'DESC');

		if (Number.isFinite(beforeMessageId) && beforeMessageId > 0) {
			messagesQuery.andWhere('message.id < :beforeMessageId', {
				beforeMessageId,
			});
		}

		if (viewerUserId != null) {
			messagesQuery.andWhere(
				new Brackets((qb) => {
					qb.where('message.is_private = false')
						.orWhere('author.id = :viewerUserId', { viewerUserId })
						.orWhere('recipient.id = :viewerUserId', { viewerUserId });
				}),
			);
		} else {
			messagesQuery.andWhere('message.is_private = false');
		}

		const persistedMessages = await messagesQuery.take(limit + 1).getMany();
		const hasMoreOlderMessages = persistedMessages.length > limit;
		const limitedMessages = hasMoreOlderMessages
			? persistedMessages.slice(0, limit)
			: persistedMessages;

		const messages = limitedMessages.map((message) => ({
			id: message.id,
			text: message.text,
			imageUrl: message.imageUrl ?? null,
			authorId: message.author.id,
			authorName: message.author.username,
			authorAvatarUrl: message.author.avatarUrl ?? null,
			isPrivate: message.isPrivate,
			recipientId: message.recipient?.id ?? null,
			recipientName: message.recipient?.username ?? null,
			createdAt: message.createdAt,
		}));

		return {
			id: forum.id,
			name: forum.name,
			description: forum.description ?? null,
			creatorName: forum.creator.username,
			participants,
			messages,
			meta: {
				limit,
				hasMoreOlderMessages,
				oldestMessageId: messages[messages.length - 1]?.id ?? null,
				newestMessageId: messages[0]?.id ?? null,
			},
		}; 
	}

	async listForumSidebar(
		forumId: number,
		count = 5,
	): Promise<ListForumItemDto[]> {
		const safeCount = Math.max(0, Math.min(Number(count ?? 5), 20));

		const currentRows = await this.buildForumSidebarItemsQuery()
			.where('f.id = :forumId', { forumId })
			.take(1)
			.getRawMany<{
			id: string;
			name: string;
			description: string | null;
			creatorName: string;
			lastCommentAuthorName: string | null;
			messagesCount: string;
			participantsCount: string;
			createdAt: string;
			}>();

		if (!currentRows.length) {
			throw new NotFoundException('Forum nao encontrado');
		}

		if (safeCount === 0) {
			return [this.mapForumItemRow(currentRows[0])];
		}

		const sidebarCandidates = await this.forumsRepository
			.createQueryBuilder('f')
			.select('MIN(f.id)', 'minId')
			.addSelect('MAX(f.id)', 'maxId')
			.addSelect('COUNT(*)', 'total')
			.where('f.id <> :forumId', { forumId })
			.getRawOne<{ minId: string | null; maxId: string | null; total: string }>();

		const minId = Number(sidebarCandidates?.minId ?? 0);
		const maxId = Number(sidebarCandidates?.maxId ?? 0);
		const totalCandidates = Number(sidebarCandidates?.total ?? 0);

		if (
			totalCandidates <= 0 ||
			!Number.isFinite(minId) ||
			!Number.isFinite(maxId) ||
			minId > maxId
		) {
			return [this.mapForumItemRow(currentRows[0])];
		}

		const sampledIds = await this.sampleForumSidebarIds(
			forumId,
			safeCount,
			minId,
			maxId,
		);

		if (!sampledIds.length) {
			return [this.mapForumItemRow(currentRows[0])];
		}

		const sampledRows = await this.buildForumSidebarItemsQuery()
			.where('f.id IN (:...sampledIds)', { sampledIds })
			.getRawMany<{
			id: string;
			name: string;
			description: string | null;
			creatorName: string;
			lastCommentAuthorName: string | null;
			messagesCount: string;
			participantsCount: string;
			createdAt: string;
			}>();

		const sampledRowsById = new Map<number, typeof sampledRows[number]>();
		for (const row of sampledRows) {
			sampledRowsById.set(Number(row.id), row);
		}

		const orderedSampledRows = sampledIds
			.map((id) => sampledRowsById.get(id))
			.filter((row): row is typeof sampledRows[number] => row != null);

		return [
			this.mapForumItemRow(currentRows[0]),
			...orderedSampledRows.map((row) => this.mapForumItemRow(row)),
		];
	}

	private async sampleForumSidebarIds(
		excludedForumId: number,
		requiredCount: number,
		minId: number,
		maxId: number,
	): Promise<number[]> {
		const target = Math.max(0, Math.floor(requiredCount));

		if (!target || minId > maxId) {
			return [];
		}

		const selected = new Set<number>();
		const maxAttempts = Math.max(target * 8, 24);

		for (let attempt = 0; attempt < maxAttempts && selected.size < target; attempt++) {
			const remaining = target - selected.size;
			const batchSize = Math.min(Math.max(remaining * 3, 8), 120);
			const randomCandidates = this.generateRandomForumIdBatch(
				minId,
				maxId,
				batchSize,
				excludedForumId,
				selected,
			);

			if (!randomCandidates.length) {
				break;
			}

			const existingRows = await this.forumsRepository
				.createQueryBuilder('f')
				.select('f.id', 'id')
				.where('f.id IN (:...randomCandidates)', { randomCandidates })
				.andWhere('f.id <> :excludedForumId', { excludedForumId })
				.getRawMany<{ id: string }>();

			for (const row of existingRows) {
				selected.add(Number(row.id));
				if (selected.size >= target) {
					break;
				}
			}
		}

		if (selected.size < target) {
			const missing = target - selected.size;
			const selectedIds = Array.from(selected);
			const fallbackQuery = this.forumsRepository
				.createQueryBuilder('f')
				.select('f.id', 'id')
				.where('f.id <> :excludedForumId', { excludedForumId });

			if (selectedIds.length > 0) {
				fallbackQuery.andWhere('f.id NOT IN (:...selectedIds)', { selectedIds });
			}

			const fallbackRows = await fallbackQuery
				.orderBy('f.id', 'DESC')
				.take(missing)
				.getRawMany<{ id: string }>();

			for (const row of fallbackRows) {
				selected.add(Number(row.id));
				if (selected.size >= target) {
					break;
				}
			}
		}

		return this.shuffleNumbers(Array.from(selected)).slice(0, target);
	}

	private generateRandomForumIdBatch(
		minId: number,
		maxId: number,
		batchSize: number,
		excludedForumId: number,
		alreadySelected: Set<number>,
	): number[] {
		const ids = new Set<number>();
		const rangeSize = maxId - minId + 1;
		const maxIterations = Math.max(batchSize * 3, 30);

		if (rangeSize <= 1) {
			return [];
		}

		for (let i = 0; i < maxIterations && ids.size < batchSize; i++) {
			const randomId = Math.floor(Math.random() * rangeSize) + minId;

			if (randomId === excludedForumId || alreadySelected.has(randomId)) {
				continue;
			}

			ids.add(randomId);
		}

		return Array.from(ids);
	}

	private shuffleNumbers(values: number[]): number[] {
		const copy = [...values];

		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}

		return copy;
	}

	private buildForumSidebarItemsQuery(): SelectQueryBuilder<Forum> {
		return this.forumsRepository
			.createQueryBuilder('f')
			.leftJoin('f.creator', 'c')
			.select('f.id', 'id')
			.addSelect('f.name', 'name')
			.addSelect('f.description', 'description')
			.addSelect('c.username', 'creatorName')
			.addSelect(
				`(
					SELECT u.username
					FROM messages lm
					JOIN users u ON u.id = lm."authorId"
					WHERE lm."forumId" = f.id
					ORDER BY lm."createdAt" DESC, lm.id DESC
					LIMIT 1
				)`,
				'lastCommentAuthorName',
			)
			.addSelect(
				`(
					SELECT COUNT(*)
					FROM messages m
					WHERE m."forumId" = f.id
					  AND m.is_private = false
				)::int`,
				'messagesCount',
			)
			.addSelect(
				`(
					SELECT COUNT(*)
					FROM forum_participants p
					WHERE p."forumId" = f.id
				)::int`,
				'participantsCount',
			)
			.addSelect('f.createdAt', 'createdAt');
	}

	async ensureForumParticipant(forumId: number, userId: number): Promise<void> {
		const forum = await this.forumsRepository.findOne({
			where: { id: forumId },
		});

		if (!forum) {
			throw new NotFoundException('Forum nao encontrado');
		}

		const user = await this.usersRepository.findOne({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('Usuario nao encontrado');
		}

		const existingParticipant = await this.participantsRepository.findOne({
			where: {
				forum: { id: forumId },
				user: { id: userId },
			},
			relations: {
				forum: true,
				user: true,
			},
		});

		if (existingParticipant) {
			existingParticipant.lastInteraction = new Date();
			await this.participantsRepository.save(existingParticipant);
			await this.syncForumParticipantsCount(forumId);
			return;
		}

		const participant = this.participantsRepository.create({
			forum,
			user,
			lastInteraction: new Date(),
			lastReadAt: new Date(),
		});

		await this.participantsRepository.save(participant);
		await this.syncForumParticipantsCount(forumId);
	}

	private async syncForumParticipantsCount(forumId: number): Promise<void> {
		const participantsTotal = await this.participantsRepository.count({
			where: {
				forum: { id: forumId },
			},
		});

		await this.forumsRepository.update(
			{ id: forumId },
			{ participantsCount: participantsTotal },
		);
	}

	private async markForumAsRead(forumId: number, userId: number): Promise<void> {
		const participant = await this.participantsRepository.findOne({
			where: {
				forum: { id: forumId },
				user: { id: userId },
			},
		});

		if (!participant) {
			return;
		}

		participant.lastReadAt = new Date();
		await this.participantsRepository.save(participant);
	}

	private async resolveForumAndUser(
		forumId: number,
		userId: number,
	) {
		const forum = await this.forumsRepository.findOne({ where: { id: forumId } });
		if (!forum) throw new NotFoundException('Forum nao encontrado');

		const user = await this.usersRepository.findOne({ where: { id: userId } });
		if (!user) throw new NotFoundException('Usuario nao encontrado');

		return { forum, user };
	}

	async createPublicMessage(
		forumId: number,
		userId: number,
		text: string,
		imageUrl?: string | null,
	): Promise<{
		id: number;
		text: string;
		imageUrl: string | null;
		authorId: number;
		authorName: string;
		authorAvatarUrl: string | null;
		isPrivate: false;
		recipientId: null;
		recipientName: null;
		createdAt: Date;
	}> {
		const { forum, user } = await this.resolveForumAndUser(forumId, userId);

		const normalizedText = `${text ?? ''}`.trim();
		const normalizedImageUrl = `${imageUrl ?? ''}`.trim() || null;

		if (!normalizedText && !normalizedImageUrl) {
			throw new BadRequestException('Mensagem invalida');
		}

		const message = this.messagesRepository.create({
			forum,
			author: user,
			text: normalizedText,
			imageUrl: normalizedImageUrl,
			isPrivate: false,
			recipient: null,
		});

		const savedMessage = await this.messagesRepository.save(message);

		forum.messagesCount += 1;
		await this.forumsRepository.save(forum);

		return {
			id: savedMessage.id,
			text: savedMessage.text,
			imageUrl: savedMessage.imageUrl ?? null,
			authorId: user.id,
			authorName: user.username,
			authorAvatarUrl: user.avatarUrl ?? null,
			isPrivate: false as const,
			recipientId: null,
			recipientName: null,
			createdAt: savedMessage.createdAt,
		};
	}

	async createPrivateMessage(
		forumId: number,
		authorId: number,
		recipientId: number,
		text: string,
		imageUrl?: string | null,
	): Promise<{
		id: number;
		text: string;
		imageUrl: string | null;
		authorId: number;
		authorName: string;
		authorAvatarUrl: string | null;
		isPrivate: true;
		recipientId: number;
		recipientName: string;
		createdAt: Date;
	}> {
		const { forum, user } = await this.resolveForumAndUser(forumId, authorId);

		const recipient = await this.usersRepository.findOne({ where: { id: recipientId } });
		if (!recipient) throw new NotFoundException('Destinatario nao encontrado');

		const normalizedText = `${text ?? ''}`.trim();
		const normalizedImageUrl = `${imageUrl ?? ''}`.trim() || null;

		if (!normalizedText && !normalizedImageUrl) {
			throw new BadRequestException('Mensagem invalida');
		}

		const message = this.messagesRepository.create({
			forum,
			author: user,
			recipient,
			text: normalizedText,
			imageUrl: normalizedImageUrl,
			isPrivate: true,
		});

		const savedMessage = await this.messagesRepository.save(message);

		forum.messagesCount += 1;
		await this.forumsRepository.save(forum);

		return {
			id: savedMessage.id,
			text: savedMessage.text,
			imageUrl: savedMessage.imageUrl ?? null,
			authorId: user.id,
			authorName: user.username,
			authorAvatarUrl: user.avatarUrl ?? null,
			isPrivate: true as const,
			recipientId: recipient.id,
			recipientName: recipient.username,
			createdAt: savedMessage.createdAt,
		};
	}

	private mapForumItemRow(row: {
		id: string;
		name: string;
		description: string | null;
		creatorName: string;
		lastCommentAuthorName: string | null;
		messagesCount: string;
		participantsCount: string;
		createdAt: string;
	}): ListForumItemDto {
		return {
			id: Number(row.id),
			name: row.name,
			description: row.description,
			creatorName: row.creatorName,
			lastCommentAuthorName: row.lastCommentAuthorName ?? row.creatorName,
			messagesCount: Number(row.messagesCount ?? 0),
			participantsCount: Number(row.participantsCount ?? 0),
			createdAt: new Date(row.createdAt),
			hasUnreadPrivateMessages: false,
		};
	}

	private applyListForumsOrderBy(
		queryBuilder: SelectQueryBuilder<Forum>,
		sort?: ListForumsQueryDto['sort'],
	): SelectQueryBuilder<Forum> {
		switch (sort) {
			case 'date_asc':
				return queryBuilder
					.orderBy('f.createdAt', 'ASC')
					.addOrderBy('f.id', 'ASC');
			case 'messages_desc':
				return queryBuilder
					.orderBy('messagesCount', 'DESC')
					.addOrderBy('f.createdAt', 'DESC')
					.addOrderBy('f.id', 'DESC');
			case 'messages_asc':
				return queryBuilder
					.orderBy('messagesCount', 'ASC')
					.addOrderBy('f.createdAt', 'ASC')
					.addOrderBy('f.id', 'ASC');
			case 'participants_desc':
				return queryBuilder
					.orderBy('participantsCount', 'DESC')
					.addOrderBy('f.createdAt', 'DESC')
					.addOrderBy('f.id', 'DESC');
			case 'participants_asc':
				return queryBuilder
					.orderBy('participantsCount', 'ASC')
					.addOrderBy('f.createdAt', 'ASC')
					.addOrderBy('f.id', 'ASC');
			case 'date_desc':
			default:
				return queryBuilder
					.orderBy('f.createdAt', 'DESC')
					.addOrderBy('f.id', 'DESC');
		}
	}

	async listUsersBasicByIds(
		ids: number[],
	): Promise<Array<{ id: number; username: string; avatarUrl: string | null }>> {
		if (!ids.length) {
			return [];
		}

		const users = await this.usersRepository.findBy(
			ids.map((id) => ({ id })),
		);

		return users.map((user) => ({
			id: user.id,
			username: user.username,
			avatarUrl: user.avatarUrl ?? null,
		}));
	}
}
