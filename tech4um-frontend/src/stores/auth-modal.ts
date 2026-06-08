import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthModalStore = defineStore('authModal', () => {
	const isOpen = ref(false)
	const mode = ref<'login' | 'signup'>('login')

	function openLogin(): void {
		mode.value = 'login'
		isOpen.value = true
	}

	function close(): void {
		isOpen.value = false
	}

	return { isOpen, mode, openLogin, close }
})
