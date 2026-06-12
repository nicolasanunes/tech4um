export type ListForumsSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'messages_desc'
  | 'messages_asc'
  | 'participants_desc'
  | 'participants_asc';

export class ListForumsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  name?: string;
  creatorName?: string;
  sort?: ListForumsSortOption;
}
