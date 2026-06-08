<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFetch } from '@/lib/api'

interface ForumByIdData {
	name: string
	description: string | null
	participants: string[]
	messages: Array<{
		id: number
		text: string
		authorName: string
		createdAt: string
	}>
}

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

const route = useRoute()
const router = useRouter()

const forumId = Number(route.params.id)
const forumName = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

async function loadForum(): Promise<void> {
	if (!Number.isFinite(forumId) || forumId <= 0) {
		await router.replace('/forums')
		return
	}

	isLoading.value = true
	errorMessage.value = null

	try {
		const response = await apiFetch(`/forums/${forumId}`, {
			method: 'GET',
		})

		if (response.status === 404) {
			await router.replace('/forums')
			return
		}

		const data = (await response.json()) as
			| ApiSuccessResponse<ForumByIdData>
			| ApiErrorResponse

		if (!response.ok || !data.success) {
			throw new Error(data.message ?? 'Falha ao carregar forum')
		}

		forumName.value = data.data.name
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : 'Falha ao carregar forum'
	} finally {
		isLoading.value = false
	}
}

onMounted(async () => {
	await loadForum()
})
</script>

<template>
	<div class="py-6">
		<p v-if="isLoading" class="text-text-color-54">Carregando forum...</p>
		<p v-else-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>
		<div v-else class="space-y-2">
			<p class="text-sm text-text-color-54">ID do forum: {{ forumId }}</p>
			<h1 class="text-2xl font-bold text-primary-default-color">{{ forumName }}</h1>
		</div>
	</div>
</template>
