export class ForumMessageDto {
  id!: number;
  text!: string;
  authorName!: string;
  createdAt!: Date;
}

export class ListForumByIdResponseDto {
  name!: string;
  description!: string | null;
  participants!: string[];
  messages!: ForumMessageDto[];
}
