export class ForumMessageDto {
  id!: number;
  text!: string;
  imageUrl!: string | null;
  authorName!: string;
  createdAt!: Date;
}

export class ListForumByIdResponseDto {
  id!: number;
  name!: string;
  description!: string | null;
  creatorName!: string;
  participants!: string[];
  messages!: ForumMessageDto[];
} 