<script setup lang="ts">
import { computed, ref } from 'vue'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

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

interface UpdateAvatarPayload {
	username: string
	email: string
	avatarUrl: string | null
}

const authStore = useAuthStore()

const isFormOpen = ref(false)
const avatarUrl = ref('')
const isSubmitting = ref(false)
const feedbackMessage = ref<string | null>(null)
const feedbackType = ref<'success' | 'error' | null>(null)

const canSubmit = computed(() => {
	return avatarUrl.value.trim().length > 0 && !isSubmitting.value
})

function toggleForm(): void {
	isFormOpen.value = !isFormOpen.value
	feedbackMessage.value = null
	feedbackType.value = null

	if (isFormOpen.value) {
		avatarUrl.value = authStore.user?.avatarUrl ?? ''
	}
}

async function handleSaveAvatar(): Promise<void> {
	if (!authStore.user) {
		feedbackType.value = 'error'
		feedbackMessage.value = 'Usuario nao autenticado.'
		return
	}

	if (!avatarUrl.value.trim()) {
		feedbackType.value = 'error'
		feedbackMessage.value = 'Informe a URL do avatar.'
		return
	}

	isSubmitting.value = true
	feedbackMessage.value = null
	feedbackType.value = null

	try {
		const response = await apiFetch('/users/me/avatar', {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				avatarUrl: avatarUrl.value.trim(),
			}),
		})

		const data = (await response.json()) as
			| ApiSuccessResponse<UpdateAvatarPayload>
			| ApiErrorResponse

		if (!response.ok || !data.success) {
			throw new Error(data.message ?? 'Falha ao atualizar avatar.')
		}

		if (authStore.user) {
			authStore.user = {
				...authStore.user,
				avatarUrl: data.data.avatarUrl,
			}
		}

		feedbackType.value = 'success'
		feedbackMessage.value = 'Avatar atualizado com sucesso.'
		isFormOpen.value = false
	} catch (error) {
		feedbackType.value = 'error'
		feedbackMessage.value =
			error instanceof Error ? error.message : 'Falha ao atualizar avatar.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
	<div class="space-y-2">
		<button
			class="w-full rounded px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 cursor-pointer"
			type="button"
			@click="toggleForm"
		>
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-plus-icon lucide-image-plus"><path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/></svg>
        Atualizar avatar
      </div>
		</button>

		<div v-if="isFormOpen" class="space-y-2 px-1 pb-1">
			<input
				v-model="avatarUrl"
				class="w-full rounded border border-slate-300 px-2 py-2 text-xs text-slate-700 outline-none transition focus:border-[#1772B3] focus:ring-2 focus:ring-[#1772B3]/20"
				type="url"
				placeholder="https://sua-imagem.com/avatar.jpg"
			/>

			<button
				class="w-full rounded bg-[#1772B3] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#135f95] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
				type="button"
				:disabled="!canSubmit"
				@click="handleSaveAvatar"
			>
				{{ isSubmitting ? 'Salvando...' : 'Salvar' }}
			</button>
		</div>

		<p
			v-if="feedbackMessage"
			class="px-1 text-xs"
			:class="feedbackType === 'success' ? 'text-emerald-600' : 'text-red-600'"
		>
			{{ feedbackMessage }}
		</p>
	</div>
</template>
