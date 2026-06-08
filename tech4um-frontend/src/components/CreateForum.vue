<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'

interface CreateForumPayload {
	name: string
	description?: string
}

const props = withDefaults(
	defineProps<{
		open: boolean
		isSubmitting?: boolean
		errorMessage?: string | null
	}>(),
	{
		isSubmitting: false,
		errorMessage: null,
	},
)

const emit = defineEmits<{
	(e: 'update:open', value: boolean): void
	(e: 'submit', payload: CreateForumPayload): void
}>()

const name = ref('')
const description = ref('')

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			name.value = ''
			description.value = ''
		}
	},
)

function closeModal() {
	emit('update:open', false)
}

function handleSubmit() {
	const payload: CreateForumPayload = {
		name: name.value.trim(),
		description: description.value.trim() || undefined,
	}

	if (!payload.name) {
		return
	}

	emit('submit', payload)
}
</script>

<template>
	<div
		v-if="open"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs px-4"
		@click.self="closeModal"
	>
		<div class="w-full max-w-lg rounded-xl bg-background-color p-6 shadow-xl">
			<div class="mb-4 font-bold">
				<p class="text-xl text-primary-default-color">Criar novo 4um</p>
				<p class="text-sm text-text-color-54">Preencha as informações para criar seu fórum.</p>
			</div>

			<form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="relative mt-6">
          <input
            type="text"
            id="forum-name"
            class="peer block w-full appearance-none rounded-lg border border-text-color-25 bg-transparent px-2.5 pb-1 pt-4 text-sm text-text-color-87 focus:border-primary-default-color focus:outline-none focus:ring-0"
            placeholder=" "
            v-model="name"
          />
          <label
            for="forum-name"
            class="absolute top-2 z-10 origin-[0] -translate-y-4 scale-75 transform bg-background-color px-2 text-sm text-text-color-54 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary-default-color rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4 start-1"
          >
            Nome
          </label>
        </div>

				<div class="relative mt-6">
					<textarea
						id="forum-description"
						v-model="description"
						class="peer block min-h-24 w-full resize-y appearance-none rounded-lg border border-text-color-25 bg-transparent px-2.5 pb-2.5 pt-5 text-sm text-text-color-87 focus:border-primary-default-color focus:outline-none focus:ring-0"
						maxlength="500"
						placeholder=" "
					/>
					<label
						for="forum-description"
						class="absolute top-2 z-10 origin-[0] -translate-y-4 scale-75 transform bg-background-color px-2 text-sm text-text-color-54 duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary-default-color rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4 start-1"
					>
						Descrição (opcional)
					</label>
				</div>

				<p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

				<div class="flex items-center justify-end gap-2 pt-2">
					<Button
						class="cursor-pointer bg-primary-dark-color hover:bg-primary-default-color"
						:disabled="isSubmitting || !name.trim()"
						type="submit"
					>
						{{ isSubmitting ? 'Criando...' : 'Criar 4um' }}
					</Button>
				</div>
			</form>
		</div>
	</div>
</template>
