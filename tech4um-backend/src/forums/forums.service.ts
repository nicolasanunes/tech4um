import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
		const creator = await this.usersRepository.findOne({
			where: { id: creatorId },
		});

		if (!creator) {
			throw new NotFoundException('Usuario criador nao encontrado');
		}

		const forum = this.forumsRepository.create({
			name: createForumDto.name,
			description: createForumDto.description,
			creator,
			participantsCount: 1,
		});

		let savedForum: Forum;

		try {
			savedForum = await this.forumsRepository.save(forum);
		} catch (error) {
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

		const participant = this.participantsRepository.create({
			forum: savedForum,
			user: creator,
			lastInteraction: new Date(),
		});

		await this.participantsRepository.save(participant);

		return {
			name: savedForum.name,
			description: savedForum.description ?? null,
			creatorName: creator.username,
		};
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

		const baseQuery = this.forumsRepository
			.createQueryBuilder('forum')
			.leftJoin('forum.creator', 'creator');

		if (query.search) {
			baseQuery.andWhere(
				'(forum.name ILIKE :search OR forum.description ILIKE :search OR creator.username ILIKE :search)',
				{ search: `%${query.search}%` },
			);
		}

		if (query.name) {
			baseQuery.andWhere('forum.name ILIKE :name', {
				name: `%${query.name}%`,
			});
		}

		if (query.creatorName) {
			baseQuery.andWhere('creator.username ILIKE :creatorName', {
				creatorName: `%${query.creatorName}%`,
			});
		}

		const total = await baseQuery.getCount();

		const rows = await baseQuery
			.clone()
			.select('forum.name', 'name')
			.addSelect('forum.description', 'description')
			.addSelect('creator.username', 'creatorName')
			.addSelect(
				(subQuery) =>
					subQuery
						.select('COUNT(message.id)')
						.from('messages', 'message')
						.where('message.forumId = forum.id'),
				'messagesCount',
			)
			.addSelect(
				(subQuery) =>
					subQuery
						.select('COUNT(participant.id)')
						.from('forum_participants', 'participant')
						.where('participant.forumId = forum.id'),
				'participantsCount',
			)
			.orderBy('forum.createdAt', 'DESC')
			.skip(skip)
			.take(pageSize)
			.getRawMany<{
				name: string;
				description: string | null;
				creatorName: string;
				messagesCount: string;
				participantsCount: string;
			}>();

		const items: ListForumItemDto[] = rows.map((row) => ({
			name: row.name,
			description: row.description,
			creatorName: row.creatorName,
			messagesCount: Number(row.messagesCount ?? 0),
			participantsCount: Number(row.participantsCount ?? 0),
		}));

		return {
			items,
			page,
			pageSize,
			total,
		};
	}

	async listForumById(id: number): Promise<ListForumByIdResponseDto> {
		const forum = await this.forumsRepository.findOne({
			where: { id },
			relations: {
				creator: true,
				participants: {
					user: true,
				},
				messages: {
					author: true,
				},
			},
		});

		if (!forum) {
			throw new NotFoundException('Forum nao encontrado');
		}

		const participants = forum.participants
			.map((participant) => participant.user.username)
			.filter((value, index, self) => self.indexOf(value) === index);

		const messages = forum.messages
			.slice()
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
			.map((message) => ({
				id: message.id,
				text: message.text,
				authorName: message.author.username,
				createdAt: message.createdAt,
			}));

		return {
			name: forum.name,
			description: forum.description ?? null,
			participants,
			messages,
		};
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
			return;
		}

		const participant = this.participantsRepository.create({
			forum,
			user,
			lastInteraction: new Date(),
		});

		await this.participantsRepository.save(participant);

		forum.participantsCount += 1;
		await this.forumsRepository.save(forum);
	}

	async createPublicMessage(
		forumId: number,
		userId: number,
		text: string,
	): Promise<{ id: number; text: string; authorName: string; createdAt: Date }> {
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

		const message = this.messagesRepository.create({
			forum,
			author: user,
			text,
		});

		const savedMessage = await this.messagesRepository.save(message);

		forum.messagesCount += 1;
		await this.forumsRepository.save(forum);

		return {
			id: savedMessage.id,
			text: savedMessage.text,
			authorName: user.username,
			createdAt: savedMessage.createdAt,
		};
	}
}
