import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateUserAvatarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  avatarUrl: string;
}