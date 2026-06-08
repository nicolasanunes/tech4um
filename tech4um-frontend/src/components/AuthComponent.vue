<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useAuthModalStore } from '@/stores/auth-modal'

interface ApiSuccessResponse<T> {
	success: true
	statusCode: number
	data: T
	message: string
}

interface ApiErrorResponse {
	success: false
	statusCode: number
	data: null
	message: string
	error: string | null
	path: string
	timestamp: string
}

const authStore = useAuthStore()
const authModalStore = useAuthModalStore()

const isOpen = ref(false)
const mode = ref<'login' | 'signup'>('login')

watch(
	() => authModalStore.isOpen,
	(open) => {
		if (open) {
			openModal(authModalStore.mode)
			authModalStore.close()
		}
	},
)
const localError = ref<string | null>(null)
const isSubmitting = ref(false)
const isLoginPasswordVisible = ref(false)
const isSignUpPasswordVisible = ref(false)

const loginForm = ref({
	username: '',
	password: '',
})

const signUpForm = ref({
	username: '',
	email: '',
	password: '',
})

const title = computed(() =>
	mode.value === 'login' ? 'Que bom ter você aqui!' : 'Criar conta',
)

const subtitle = computed(() =>
	mode.value === 'login'
		? 'Para participar de um 4um é necessário fazer login.'
		: 'Preencha os dados para criar sua conta no 4um.',
)

function openModal(type: 'login' | 'signup'): void {
	mode.value = type
	localError.value = null
	authStore.clearAuthError()
	isOpen.value = true
}

function closeModal(): void {
	isOpen.value = false
}

function switchMode(nextMode: 'login' | 'signup'): void {
	mode.value = nextMode
	localError.value = null
	authStore.clearAuthError()
}

async function submitLogin(): Promise<void> {
	localError.value = null

	if (!loginForm.value.username.trim() || !loginForm.value.password) {
		localError.value = 'Informe username e senha.'
		return
	}

	isSubmitting.value = true

	try {
		await authStore.login({
			username: loginForm.value.username.trim(),
			password: loginForm.value.password,
		})

		loginForm.value.password = ''
		closeModal()
	} catch (error) {
		localError.value =
			error instanceof Error ? error.message : 'Falha ao realizar login.'
	} finally {
		isSubmitting.value = false
	}
}

async function submitSignUp(): Promise<void> {
	localError.value = null

	if (
		!signUpForm.value.username.trim() ||
		!signUpForm.value.email.trim() ||
		!signUpForm.value.password
	) {
		localError.value = 'Preencha username, email e senha.'
		return
	}

	isSubmitting.value = true

	try {
		const response = await apiFetch('/users', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username: signUpForm.value.username.trim(),
				email: signUpForm.value.email.trim(),
				password: signUpForm.value.password,
			}),
		})

		const data = (await response.json()) as
			| ApiSuccessResponse<unknown>
			| ApiErrorResponse

		if (!response.ok || !data.success) {
			throw new Error(data.message ?? 'Falha ao criar conta.')
		}

		loginForm.value.username = signUpForm.value.username.trim()
		loginForm.value.password = signUpForm.value.password

		signUpForm.value = {
			username: '',
			email: '',
			password: '',
		}

		switchMode('login')
	} catch (error) {
		localError.value =
			error instanceof Error ? error.message : 'Falha ao criar conta.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
	<div class="flex items-center gap-2">
		<Button
			class="cursor-pointer bg-transparent px-4 py-2 text-sm font-semibold text-text-color-54 shadow-none hover:bg-transparent hover:text-text-color-87"
			type="button"
			@click="openModal('login')"
		>
			Fazer Login
		</Button>
	</div>

	<div
		v-if="isOpen"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs px-4"
		@click.self="closeModal"
	>
		<div class="w-full max-w-md rounded-xl border border-black/10 bg-background-color p-6 shadow-2xl">
			<div class="font-bold mb-4">
				<h2 class="text-xl text-primary-default-color">{{ title }}</h2>
				<p class="mt-1 text-sm text-text-color-54">{{ subtitle }}</p>
			</div>

			<form v-if="mode === 'login'" class="space-y-4" @submit.prevent="submitLogin">
				<div class="relative mt-6">
					<Input
						id="login-username"
						v-model="loginForm.username"
						class="peer block h-auto w-full appearance-none rounded-lg border border-text-color-25 bg-transparent px-2.5 pb-1 pt-4 text-sm text-text-color-87 focus-visible:border-primary-default-color focus-visible:ring-0"
						type="text"
						autocomplete="username"
						placeholder=" "
					/>
					<label
						for="login-username"
						class="absolute top-2 z-10 origin-[0] -translate-y-4 scale-75 transform bg-background-color px-2 text-sm text-text-color-54 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary-default-color rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4 start-1"
					>
						Nome
					</label>
				</div>
				<div class="relative mt-6">
					<Input
						id="login-password"
						v-model="loginForm.password"
						class="peer block h-auto w-full appearance-none rounded-lg border border-text-color-25 bg-transparent px-2.5 pb-1 pt-4 pr-10 text-sm text-text-color-87 focus-visible:border-primary-default-color focus-visible:ring-0"
						:type="isLoginPasswordVisible ? 'text' : 'password'"
						autocomplete="current-password"
						placeholder=" "
					/>
					<button
						type="button"
						class="absolute right-2 top-1/2 z-20 -translate-y-1/2 cursor-pointer text-text-color-54 hover:text-text-color-87"
						:aria-label="isLoginPasswordVisible ? 'Ocultar senha' : 'Exibir senha'"
						@click="isLoginPasswordVisible = !isLoginPasswordVisible"
					>
						<svg v-if="isLoginPasswordVisible" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 lucide lucide-eye-off-icon lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
					</button>
					<label
						for="login-password"
						class="absolute top-2 z-10 origin-[0] -translate-y-4 scale-75 transform bg-background-color px-2 text-sm text-text-color-54 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary-default-color rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4 start-1"
					>
						Senha
					</label>
				</div>

				<p v-if="localError || authStore.errorMessage" class="text-sm text-red-600">
					{{ localError ?? authStore.errorMessage }}
				</p>

				<Button
					class="w-full cursor-pointer bg-primary-dark-color text-white hover:bg-primary-default-color"
					type="submit"
					:disabled="isSubmitting || authStore.isLoading"
				>
					{{ isSubmitting || authStore.isLoading ? 'Entrando...' : 'Entrar' }}
				</Button>
			</form>

			<form v-else class="space-y-4" @submit.prevent="submitSignUp">
				<div class="relative mt-6">
					<Input
						id="signup-username"
						v-model="signUpForm.username"
						class="peer block h-auto w-full appearance-none rounded-lg border border-text-color-25 bg-transparent px-2.5 pb-1 pt-4 text-sm text-text-color-87 focus-visible:border-primary-default-color focus-visible:ring-0"
						type="text"
						autocomplete="username"
						placeholder=" "
					/>
					<label
						for="signup-username"
						class="absolute top-2 z-10 origin-[0] -translate-y-4 scale-75 transform bg-background-color px-2 text-sm text-text-color-54 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary-default-color rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4 start-1"
					>
						Username
					</label>
				</div>
				<div class="relative mt-6">
					<Input
						id="signup-email"
						v-model="signUpForm.email"
						class="peer block h-auto w-full appearance-none rounded-lg border border-text-color-25 bg-transparent px-2.5 pb-1 pt-4 text-sm text-text-color-87 focus-visible:border-primary-default-color focus-visible:ring-0"
						type="email"
						autocomplete="email"
						placeholder=" "
					/>
					<label
						for="signup-email"
						class="absolute top-2 z-10 origin-[0] -translate-y-4 scale-75 transform bg-background-color px-2 text-sm text-text-color-54 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary-default-color rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4 start-1"
					>
						Email
					</label>
				</div>
				<div class="relative mt-6">
					<Input
						id="signup-password"
						v-model="signUpForm.password"
						class="peer block h-auto w-full appearance-none rounded-lg border border-text-color-25 bg-transparent px-2.5 pb-1 pt-4 pr-10 text-sm text-text-color-87 focus-visible:border-primary-default-color focus-visible:ring-0"
						:type="isSignUpPasswordVisible ? 'text' : 'password'"
						autocomplete="new-password"
						placeholder=" "
					/>
					<button
						type="button"
						class="absolute right-2 top-1/2 z-20 -translate-y-1/2 cursor-pointer text-text-color-54 hover:text-text-color-87"
						:aria-label="isSignUpPasswordVisible ? 'Ocultar senha' : 'Exibir senha'"
						@click="isSignUpPasswordVisible = !isSignUpPasswordVisible"
					>
						<svg v-if="isSignUpPasswordVisible" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 lucide lucide-eye-off-icon lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
					</button>
					<label
						for="signup-password"
						class="absolute top-2 z-10 origin-[0] -translate-y-4 scale-75 transform bg-background-color px-2 text-sm text-text-color-54 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary-default-color rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4 start-1"
					>
						Senha
					</label>
				</div>

				<p v-if="localError" class="text-sm text-red-600">
					{{ localError }}
				</p>

				<Button
					class="w-full cursor-pointer bg-primary-dark-color text-white hover:bg-primary-default-color"
					type="submit"
					:disabled="isSubmitting"
				>
					{{ isSubmitting ? 'Criando conta...' : 'Criar Conta' }}
				</Button>
			</form>

			<div class="mt-5 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
				<template v-if="mode === 'login'">
					Nao tem conta?
					<Button
						type="button"
						class="ml-1 h-auto cursor-pointer bg-transparent p-0 font-semibold text-primary-dark-color shadow-none hover:bg-transparent hover:underline"
						@click="switchMode('signup')"
					>
						Criar Conta
					</Button>
				</template>
				<template v-else>
					Ja possui conta?
					<Button
						type="button"
						class="ml-1 h-auto cursor-pointer bg-transparent p-0 font-semibold text-primary-dark-color shadow-none hover:bg-transparent hover:underline"
						@click="switchMode('login')"
					>
						Entrar
					</Button>
				</template>
			</div>
		</div>
	</div>
</template>
