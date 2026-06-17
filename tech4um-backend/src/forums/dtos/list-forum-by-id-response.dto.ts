export class ForumMessageDto {
  id!: number;
  text!: string;
  imageUrl!: string | null;
  authorId!: number;
  authorName!: string;
  authorAvatarUrl!: string | null;
  isPrivate!: boolean;
  recipientId!: number | null;
  recipientName!: string | null;
  createdAt!: Date;
}

export class ForumParticipantDto {
  id!: number;
  username!: string;
  avatarUrl!: string | null;
}

export class ForumMessagesMetaDto {
  limit!: number;
  hasMoreOlderMessages!: boolean;
  oldestMessageId!: number | null;
  newestMessageId!: number | null;
}

export class ListForumByIdResponseDto {
  id!: number;
  name!: string;
  description!: string | null;
  creatorName!: string;
  participants!: ForumParticipantDto[];
  messages!: ForumMessageDto[];
  meta!: ForumMessagesMetaDto;
} 