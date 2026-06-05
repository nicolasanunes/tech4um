import {
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dtos/login.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { LoginPayloadDto } from './dtos/login-payload.dto';
import { ListUserDto } from '../users/dtos/list-user.dto';
import { UsersService } from '../users/users.service';
import { Response } from 'express';
import { User } from '../users/entities/user.entity';
import {
	setAccessTokenCookie,
	setRefreshTokenCookie,
} from '../utils/cookies';
import { validatePassword } from '../utils/password';

interface AuthTokens {
	accessToken: string;
	refreshToken: string;
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);
	private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
	private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
	) {}
 
	async login(loginDto: LoginDto, response: Response): Promise<LoginResponseDto> {
		this.logger.log(`Tentativa de login: ${loginDto.username}`);

		const user = await this.usersService
			.listUserByUsername(loginDto.username)
			.catch(() => null);

		if (!user) {
			this.logger.warn(`Login falhou para: ${loginDto.username}`);
			throw new UnauthorizedException('Credenciais invalidas');
		}

		const passwordMatches = await validatePassword(
			loginDto.password,
			user.password,
		);

		if (!passwordMatches) {
			this.logger.warn(`Login falhou para: ${loginDto.username}`);
			throw new UnauthorizedException('Credenciais invalidas');
		}

		const tokens = await this.createAuthTokens(user);
		setAccessTokenCookie(response, tokens.accessToken);
		setRefreshTokenCookie(response, tokens.refreshToken);
		this.logger.log(`Login bem-sucedido: userId=${user.id} username=${user.username}`);
 
        return {
            user: {
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
            }
        }
	}

	async logout(response: Response): Promise<null> {
		response.clearCookie(
			'accessToken',
			{
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict' as const,
				path: '/',
			},
		);

		response.clearCookie(
			'refreshToken',
			{
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict' as const,
				path: '/',
			},
		);

		return null;
	}

	private async createAuthTokens(user: User): Promise<AuthTokens> {
		const payload: LoginPayloadDto = {
			id: user.id,
			username: user.username,
			email: user.email,
		};

		const accessToken = await this.jwtService.signAsync(payload, {
			secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
			expiresIn: AuthService.ACCESS_TOKEN_EXPIRES_IN,
		});

		const refreshToken = await this.jwtService.signAsync(payload, {
			secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
			expiresIn: AuthService.REFRESH_TOKEN_EXPIRES_IN,
		});

		return { accessToken, refreshToken };
	}
}
