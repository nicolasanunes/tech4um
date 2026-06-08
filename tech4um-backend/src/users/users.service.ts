import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ListUserDto } from './dtos/list-user.dto';
import { UpdateUserAvatarDto } from './dtos/update-user-avatar.dto';

@Injectable()
export class UsersService {
  private static readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<ListUserDto> {
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      UsersService.SALT_ROUNDS,
    );

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    let savedUser: User;

    try {
      savedUser = await this.userRepository.save(user);
    } catch (error) {
      const driverError = error as {
        code?: string;
        driverError?: { code?: string; constraint?: string };
        constraint?: string;
      };

      const errorCode = driverError.code ?? driverError.driverError?.code;
      const constraintName =
        driverError.constraint ?? driverError.driverError?.constraint ?? '';

      if (
        errorCode === '23505' &&
        constraintName.toLowerCase().includes('username')
      ) {
        throw new ConflictException('Usuario ja existe');
      }

      if (errorCode === '23505') {
        throw new ConflictException('Registro ja existente');
      }

      throw error;
    }

    return {
      username: savedUser.username,
      email: savedUser.email,
      avatarUrl: savedUser.avatarUrl,
    };
  }

  async listUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async listUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  async listUserById(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }

  async updateAvatarByUserId(
    userId: number,
    updateUserAvatarDto: UpdateUserAvatarDto,
  ): Promise<ListUserDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    user.avatarUrl = updateUserAvatarDto.avatarUrl;
    const updatedUser = await this.userRepository.save(user);

    return {
      username: updatedUser.username,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
    };
  }
}
