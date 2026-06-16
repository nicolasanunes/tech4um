<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

defineOptions({
	name: 'ForumDragOrDropImage',
})

const emit = defineEmits<{
	(e: 'select', file: File): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isModalOpen = ref(false)
const isDragging = ref(false)
const previewImageUrl = ref<string | null>(null)
const feedbackMessage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)

function revokePreviewImageUrl(): void {
	if (!previewImageUrl.value) {
		return
	}

	URL.revokeObjectURL(previewImageUrl.value)
	previewImageUrl.value = null
}

function openModal(): void {
	isModalOpen.value = true
	feedbackMessage.value = null
}

function closeModal(): void {
	isModalOpen.value = false
	isDragging.value = false
	revokePreviewImageUrl()
	selectedFile.value = null
	feedbackMessage.value = null

	if (fileInputRef.value) {
		fileInputRef.value.value = ''
	}
}

function pickImage(): void {
	fileInputRef.value?.click()
}

function clearSelectedImage(): void {
	revokePreviewImageUrl()
	selectedFile.value = null
	feedbackMessage.value = null
	isDragging.value = false

	if (fileInputRef.value) {
		fileInputRef.value.value = ''
	}
}

function onInputChange(event: Event): void {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]

	if (!file) {
		return
	}

	void loadFile(file)
}

async function onDrop(event: DragEvent): Promise<void> {
	event.preventDefault()
	isDragging.value = false

	const file = event.dataTransfer?.files?.[0]
	if (!file) {
		return
	}

	await loadFile(file)
}

function onDragOver(event: DragEvent): void {
	event.preventDefault()
	isDragging.value = true
}

function onDragLeave(): void {
	isDragging.value = false
}

async function loadFile(file: File): Promise<void> {
	feedbackMessage.value = null

	if (!file.type.startsWith('image/')) {
		feedbackMessage.value = 'Selecione apenas arquivos de imagem.'
		return
	}

	if (file.size > 5 * 1024 * 1024) {
		feedbackMessage.value = 'A imagem deve ter no maximo 5MB.'
		return
	}

	revokePreviewImageUrl()
	selectedFile.value = file
	previewImageUrl.value = URL.createObjectURL(file)
}

function sendImage(): void {
	if (!selectedFile.value) {
		feedbackMessage.value = 'Selecione uma imagem antes de enviar.'
		return
	}

	emit('select', selectedFile.value)
	closeModal()
}

onBeforeUnmount(() => {
	revokePreviewImageUrl()
})
</script>

<template>
	<div>
		<button
			type="button"
			class="cursor-pointer"
			aria-label="Abrir modal para envio de imagem"
			@click="openModal"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
		</button>

		<div
			v-if="isModalOpen"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs px-4"
			@click.self="closeModal"
		>
			<div class="w-full max-w-md rounded-xl bg-background-color p-4 shadow-xl">
				<p class="mb-3 text-xl font-bold text-primary-default-color">Enviar imagem no chat</p>

				<div
					v-if="!previewImageUrl"
					class="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors hover:bg-white/50"
					:class="isDragging ? 'border-primary-default-color bg-primary-default-color/10' : 'border-border bg-background-color'"
					@click="pickImage"
					@drop="onDrop"
					@dragover="onDragOver"
					@dragleave="onDragLeave"
				>
					<input
						ref="fileInputRef"
						type="file"
						accept="image/*"
						class="hidden"
						@change="onInputChange"
					>

					<p class="text-sm text-text-color-54">Arraste e solte uma imagem aqui</p>
					<p class="mt-1 text-xs text-text-color-54">ou clique para selecionar (maximo 5MB)</p>
				</div>

				<p v-if="feedbackMessage" class="mt-2 text-xs text-red-600">{{ feedbackMessage }}</p>

				<div v-if="previewImageUrl" class="relative mt-3">
					<button
						type="button"
						class="absolute right-2 top-2 z-10 rounded-full bg-primary-dark-color p-1 text-white transition hover:bg-primary-default-color cursor-pointer"
						aria-label="Remover imagem selecionada"
						@click="clearSelectedImage"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
					</button>

					<img
					v-if="previewImageUrl"
					:src="previewImageUrl"
					alt="Preview da imagem"
					class="max-h-52 w-full rounded-lg object-cover"
					>
				</div>

				<div class="mt-4 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-md bg-primary-dark-color px-3 py-2 text-xs text-white cursor-pointer hover:bg-primary-default-color disabled:cursor-not-allowed disabled:bg-primary-dark-color/50"
						:disabled="!previewImageUrl"
						@click="sendImage"
					>
						Enviar imagem
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
