import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateForumDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(255)
	name!: string;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	description?: string;
}

