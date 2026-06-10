<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
	modelValue: string | null
}>()

const emit = defineEmits<{
	(e: 'update:modelValue', value: string | null): void
}>()

const isOpen = computed(() => Boolean(props.modelValue))

function closeModal(): void {
	emit('update:modelValue', null)
}
</script>

<template>
	<div
		v-if="isOpen"
		class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-xs px-4"
		@click.self="closeModal"
	>
		<button
			type="button"
			class="absolute right-4 top-4 rounded-full bg-primary-dark-color p-2 text-white transition hover:bg-primary-default-color cursor-pointer"
			aria-label="Fechar imagem"
			@click="closeModal"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
		</button>

		<img
			v-if="modelValue"
			:src="modelValue"
			alt="Imagem em tela cheia"
			class="max-h-[90vh] max-w-[95vw] object-contain"
		>
	</div>
</template>
