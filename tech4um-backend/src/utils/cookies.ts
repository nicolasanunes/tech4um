import { Response } from 'express';

export const setAccessTokenCookie = (
	response: Response,
	token: string,
): void => {
	response.cookie('accessToken', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		path: '/',
		maxAge: 15 * 60 * 1000,
	});
};

export const setRefreshTokenCookie = (
	response: Response,
	token: string,
): void => {
	response.cookie('refreshToken', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		path: '/',
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
};
