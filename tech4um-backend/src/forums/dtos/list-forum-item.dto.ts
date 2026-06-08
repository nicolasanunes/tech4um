export class ListForumItemDto {
  id!: number;
  name!: string;
  description!: string | null;
  creatorName!: string;
  lastCommentAuthorName!: string | null;
  messagesCount!: number;
  participantsCount!: number;
}
