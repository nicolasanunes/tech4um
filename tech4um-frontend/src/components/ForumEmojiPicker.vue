<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import 'emoji-picker-element'

defineOptions({
	name: 'ForumEmojiPicker',
})

const emit = defineEmits<{
	(e: 'select', unicode: string): void
}>()

const emojiPickerRef = ref<HTMLElement | null>(null)
const emojiButtonRef = ref<HTMLButtonElement | null>(null)
const isEmojiPickerOpen = ref(false)

function toggleEmojiPicker(): void {
	isEmojiPickerOpen.value = !isEmojiPickerOpen.value

	if (isEmojiPickerOpen.value) {
		nextTick(() => {
			applyEmojiPickerScrollbarStyles()
		})
	}
}

function applyEmojiPickerScrollbarStyles(): void {
	const picker = emojiPickerRef.value?.querySelector('emoji-picker') as
		| (HTMLElement & { shadowRoot: ShadowRoot | null })
		| null

	if (!picker?.shadowRoot) {
		return
	}

	if (picker.shadowRoot.querySelector('[data-tech4um-scrollbar-style]')) {
		return
	}

	const style = document.createElement('style')
	style.setAttribute('data-tech4um-scrollbar-style', 'true')
	style.textContent = `
		::-webkit-scrollbar {
			width: 10px;
		}

		::-webkit-scrollbar-track {
			background: #F3F3F3;
		}

		::-webkit-scrollbar-thumb {
			background: #1772B2;
			border-radius: 8px;
		}

		::-webkit-scrollbar-thumb:hover {
			background: #125A8C;
		}
	`

	picker.shadowRoot.appendChild(style)
}

function onEmojiClick(event: Event): void {
	const detail = (event as CustomEvent<{ unicode?: string; emoji?: { unicode?: string } }>).detail
	const unicode = detail?.unicode ?? detail?.emoji?.unicode

	if (!unicode) {
		return
	}

	emit('select', unicode)
	isEmojiPickerOpen.value = false
}

function handleOutsideEmojiPickerClick(event: MouseEvent): void {
	if (!isEmojiPickerOpen.value) {
		return
	}

	const target = event.target as Node | null
	if (!target) {
		return
	}

	if (
		emojiPickerRef.value?.contains(target) ||
		emojiButtonRef.value?.contains(target)
	) {
		return
	}

	isEmojiPickerOpen.value = false
}

onMounted(() => {
	document.addEventListener('click', handleOutsideEmojiPickerClick)
})

onBeforeUnmount(() => {
	document.removeEventListener('click', handleOutsideEmojiPickerClick)
	isEmojiPickerOpen.value = false
})
</script>

<template>
	<div class="relative">
		<button
			ref="emojiButtonRef"
			class="cursor-pointer"
			type="button"
			aria-label="Abrir seletor de emoji"
			@click="toggleEmojiPicker"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smile-icon lucide-smile"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
		</button>
		<div
			v-if="isEmojiPickerOpen"
			ref="emojiPickerRef"
			class="absolute right-0 bottom-7 z-20 overflow-hidden rounded-lg border-1 border-[#1772B2]"
		>
			<emoji-picker class="emoji-picker" @emoji-click="onEmojiClick" />
		</div>
	</div>
</template>

<style scoped>
.emoji-picker {
	--background: #F3F3F3;
	--border-color: #F3F3F3;
	--input-background-color: #FFFFFF;
	--input-border-color: #1772B2;
	--input-font-color: #333333;
	--button-hover-background: #1772B2;
	--scrollbar-thumb-color: #1772B2;
	--scrollbar-track-color: #F3F3F3;
}
</style>
