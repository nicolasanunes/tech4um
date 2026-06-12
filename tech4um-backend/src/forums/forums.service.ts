import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
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

	async listAllForums(query: ListForumsQueryDto): Promise<{
		items: ListForumItemDto[];
		page: number;
		pageSize: number;
		total: number;
	}> {
		const page = Math.max(1, Number(query.page ?? 1));
		const pageSize = Math.max(1, Math.min(Number(query.pageSize ?? 10), 100));
		const skip = (page - 1) * pageSize;
		const orderBy = this.resolveListForumsOrderBy(query.sort);

		const conditions: string[] = [];
		const params: unknown[] = [];
		let p = 1;

		if (query.search?.trim()) {
			conditions.push(
				`(f.name ILIKE $${p} OR f.description ILIKE $${p} OR c.username ILIKE $${p})`,
			);
			params.push(`%${query.search.trim()}%`);
			p++;
		}

		if (query.name?.trim()) {
			conditions.push(`f.name ILIKE $${p}`);
			params.push(`%${query.name.trim()}%`);
			p++;
		}

		if (query.creatorName?.trim()) {
			conditions.push(`c.username ILIKE $${p}`);
			params.push(`%${query.creatorName.trim()}%`);
			p++;
		}

		const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		const manager = this.forumsRepository.manager;

		const countResult = await manager.query<[{ total: string }]>(
			`SELECT COUNT(DISTINCT f.id)::int AS total
			 FROM forums f
			 LEFT JOIN users c ON c.id = f."creatorId"
			 ${where}`,
			params,
		);

		const total = Number(countResult[0]?.total ?? 0);

		const rows = await manager.query<{
			id: string;
			name: string;
			description: string | null;
			creatorName: string;
			lastCommentAuthorName: string | null;
			messagesCount: string;
			participantsCount: string;
			createdAt: string;
		}[]>(
			`SELECT
				f.id                        AS id,
				f.name                      AS name,
				f.description               AS description,
				c.username                  AS "creatorName",
				last_msg.username           AS "lastCommentAuthorName",
				(SELECT COUNT(*) FROM messages m   WHERE m."forumId" = f.id)::int AS "messagesCount",
				(SELECT COUNT(*) FROM forum_participants p WHERE p."forumId" = f.id)::int AS "participantsCount",
				f."createdAt"              AS "createdAt"
			 FROM forums f
			 LEFT JOIN users c ON c.id = f."creatorId"
			 LEFT JOIN LATERAL (
				SELECT u.username
				FROM messages lm
				JOIN users u ON u.id = lm."authorId"
				WHERE lm."forumId" = f.id
				ORDER BY lm."createdAt" DESC, lm.id DESC
				LIMIT 1
			 ) last_msg ON true
			 ${where}
			 ORDER BY ${orderBy}
			 LIMIT $${p} OFFSET $${p + 1}`,
			[...params, pageSize, skip],
		);

		const items: ListForumItemDto[] = rows.map((row) => ({
			id: Number(row.id),
			name: row.name,
			description: row.description,
			creatorName: row.creatorName,
			lastCommentAuthorName: row.lastCommentAuthorName ?? row.creatorName,
			messagesCount: Number(row.messagesCount ?? 0),
			participantsCount: Number(row.participantsCount ?? 0),
			createdAt: new Date(row.createdAt),
		}));

		return { items, page, pageSize, total };
	}

	async listForumById(id: number, viewerUserId?: number): Promise<ListForumByIdResponseDto> {
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

		const messagesQuery = this.messagesRepository
			.createQueryBuilder('message')
			.leftJoinAndSelect('message.author', 'author')
			.leftJoinAndSelect('message.recipient', 'recipient')
			.where('message."forumId" = :forumId', { forumId: id })
			.orderBy('message."createdAt"', 'ASC')
			.addOrderBy('message.id', 'ASC');

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

		const persistedMessages = await messagesQuery.getMany();

		const messages = persistedMessages.map((message) => ({
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
		}; 
	}

	async listForumSidebar(
		forumId: number,
		count = 5,
	): Promise<ListForumItemDto[]> {
		const manager = this.forumsRepository.manager;
		const safeCount = Math.max(0, Math.min(Number(count ?? 5), 20));

		const currentRows = await manager.query<{
			id: string;
			name: string;
			description: string | null;
			creatorName: string;
			lastCommentAuthorName: string | null;
			messagesCount: string;
			participantsCount: string;
			createdAt: string;
		}[]>(
			`SELECT
				f.id                        AS id,
				f.name                      AS name,
				f.description               AS description,
				c.username                  AS "creatorName",
				last_msg.username           AS "lastCommentAuthorName",
				(SELECT COUNT(*) FROM messages m WHERE m."forumId" = f.id)::int AS "messagesCount",
				(SELECT COUNT(*) FROM forum_participants p WHERE p."forumId" = f.id)::int AS "participantsCount",
				f."createdAt"              AS "createdAt"
			 FROM forums f
			 LEFT JOIN users c ON c.id = f."creatorId"
			 LEFT JOIN LATERAL (
				SELECT u.username
				FROM messages lm
				JOIN users u ON u.id = lm."authorId"
				WHERE lm."forumId" = f.id
				ORDER BY lm."createdAt" DESC, lm.id DESC
				LIMIT 1
			 ) last_msg ON true
			 WHERE f.id = $1
			 LIMIT 1`,
			[forumId],
		);

		if (!currentRows.length) {
			throw new NotFoundException('Forum nao encontrado');
		}

		if (safeCount === 0) {
			return [this.mapForumItemRow(currentRows[0])];
		}

		const randomRows = await manager.query<{
			id: string;
			name: string;
			description: string | null;
			creatorName: string;
			lastCommentAuthorName: string | null;
			messagesCount: string;
			participantsCount: string;
			createdAt: string;
		}[]>(
			`SELECT
				f.id                        AS id,
				f.name                      AS name,
				f.description               AS description,
				c.username                  AS "creatorName",
				last_msg.username           AS "lastCommentAuthorName",
				(SELECT COUNT(*) FROM messages m WHERE m."forumId" = f.id)::int AS "messagesCount",
				(SELECT COUNT(*) FROM forum_participants p WHERE p."forumId" = f.id)::int AS "participantsCount",
				f."createdAt"              AS "createdAt"
			 FROM forums f
			 LEFT JOIN users c ON c.id = f."creatorId"
			 LEFT JOIN LATERAL (
				SELECT u.username
				FROM messages lm
				JOIN users u ON u.id = lm."authorId"
				WHERE lm."forumId" = f.id
				ORDER BY lm."createdAt" DESC, lm.id DESC
				LIMIT 1
			 ) last_msg ON true
			 WHERE f.id <> $1
			 ORDER BY RANDOM()
			 LIMIT $2`,
			[forumId, safeCount],
		);

		return [
			this.mapForumItemRow(currentRows[0]),
			...randomRows.map((row) => this.mapForumItemRow(row)),
		];
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
			throw new NotFoundException('Mensagem invalida');
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
			throw new NotFoundException('Mensagem invalida');
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
		};
	}

	private resolveListForumsOrderBy(sort?: ListForumsQueryDto['sort']): string {
		switch (sort) {
			case 'date_asc':
				return 'f."createdAt" ASC, f.id ASC';
			case 'messages_desc':
				return '"messagesCount" DESC, f."createdAt" DESC, f.id DESC';
			case 'messages_asc':
				return '"messagesCount" ASC, f."createdAt" ASC, f.id ASC';
			case 'participants_desc':
				return '"participantsCount" DESC, f."createdAt" DESC, f.id DESC';
			case 'participants_asc':
				return '"participantsCount" ASC, f."createdAt" ASC, f.id ASC';
			case 'date_desc':
			default:
				return 'f."createdAt" DESC, f.id DESC';
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
