import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiFetch } from '@/lib/api';

interface LoginPayload {
	username: string;
	password: string;
}

interface AuthUser {
	username: string;
	email: string;
	avatarUrl: string | null;
}

interface ApiSuccessResponse<T> {
	success: true;
	statusCode: number;
	data: T;
	message: string;
}

interface ApiErrorResponse {
	success: false;
	statusCode: number;
	data: null;
	message: string;
	error: string | null;
	path: string;
	timestamp: string;
}

type LoginApiResponse = ApiSuccessResponse<{ user: AuthUser }>;

export const useAuthStore = defineStore('auth', () => {
	const user = ref<AuthUser | null>(null);
	const isLoading = ref(false);
	const errorMessage = ref<string | null>(null);

	const isAuthenticated = computed(() => user.value !== null);

	async function login(payload: LoginPayload): Promise<AuthUser> {
		isLoading.value = true;
		errorMessage.value = null;

		try {
			const response = await apiFetch('/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			}, { retryOnUnauthorized: false });

			const data = (await response.json()) as LoginApiResponse | ApiErrorResponse;

			if (!response.ok || !data.success) {
				const message = data.message ?? 'Falha ao realizar login';
				throw new Error(message);
			}

			user.value = data.data.user;
			return data.data.user;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Falha ao realizar login';
			errorMessage.value = message;
			throw error;
		} finally {
			isLoading.value = false;
		}
	}

	async function logout(): Promise<void> {
		isLoading.value = true;
		errorMessage.value = null;

		try {
			const response = await apiFetch('/auth/logout', {
				method: 'POST',
			}, { retryOnUnauthorized: false });

			if (!response.ok) {
				let message = 'Falha ao realizar logout';

				try {
					const data = (await response.json()) as ApiErrorResponse;
					message = data.message ?? message;
				} catch {
					// keep default message when response has no JSON body
				}

				throw new Error(message);
			}

			user.value = null;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Falha ao realizar logout';
			errorMessage.value = message;
			throw error;
		} finally {
			isLoading.value = false;
		}
	}

	async function restoreSession(): Promise<void> {
		isLoading.value = true;
		errorMessage.value = null;

		try {
			const response = await apiFetch('/auth/me', {
				method: 'GET',
			});

			if (!response.ok) {
				user.value = null;
				return;
			}

			const data = (await response.json()) as LoginApiResponse | ApiErrorResponse;

			if (!data.success) {
				user.value = null;
				return;
			}

			user.value = data.data.user;
		} catch {
			user.value = null;
		} finally {
			isLoading.value = false;
		}
	}

	function clearAuthError(): void {
		errorMessage.value = null;
	}

	return {
		user,
		isLoading,
		errorMessage,
		isAuthenticated,
		login,
		logout,
		restoreSession,
		clearAuthError,
	};
});
