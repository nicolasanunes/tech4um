<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { useRoute, useRouter } from 'vue-router'
import DragOrDropImage from '@/components/DragOrDropImage.vue'
import FullscreenImage from '@/components/FullscreenImage.vue'
import ForumEmojiPicker from '@/components/ForumEmojiPicker.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { getUserInitials } from '@/utils/user-initials'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'

interface ApiSuccessResponse<T> {
	success: true
	statusCode: number
	data: T
	message: string
	meta?: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
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

interface ForumParticipant {
	id: number
	username: string
	avatarUrl: string | null
}

interface ForumMessage {
	id: number
	text: string
	imageUrl: string | null
	authorId: number
	authorName: string
	authorAvatarUrl: string | null
	isPrivate: boolean
	recipientId: number | null
	recipientName: string | null
	createdAt: string
}

interface ForumStatePayload {
	id: number
	name: string
	description: string | null
	creatorName: string
	participants: ForumParticipant[]
	messages: ForumMessage[]
}

interface LegacyForumStatePayload {
	name: string
	description: string | null
	participants: Array<ForumParticipant | string>
	messages: Array<
		| ForumMessage
		| {
			id: number
			text: string
			imageUrl?: string | null
			authorName: string
			authorAvatarUrl?: string | null
			createdAt: string
		  }
	>
}

interface ParticipantsOnlinePayload {
	forumId: number
	users: ForumParticipant[]
}

interface TypingPayload {
	forumId: number
	username?: string
	userName?: string
	authorName?: string
}

interface ChatErrorPayload {
	message: string
}

interface ForumCardItem {
	id: number
	name: string
	creatorName: string
	lastCommentAuthorName: string | null
	participantsCount: number
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentForumId = computed(() => Number(route.params.id))

const forumName = ref('')
const forumDescription = ref<string | null>(null)
const forumCreatorName = ref('')
const messages = ref<ForumMessage[]>([])
const onlineParticipants = ref<ForumParticipant[]>([])
const allParticipants = ref<ForumParticipant[]>([])
const typingUsers = ref<string[]>([])

const isLoadingForum = ref(true)
const isLoadingForums = ref(false)
const errorMessage = ref<string | null>(null)
const isParticipantsVisible = ref(true)
const privateRecipient = ref<ForumParticipant | null>(null)

const forumLayoutStyle = computed(() => ({
	'--participants-column-size': isParticipantsVisible.value ? '16rem' : '0rem',
}))

const messageInput = ref('')
const otherForums = ref<ForumCardItem[]>([])
const messagesContainerRef = ref<HTMLElement | null>(null)
const messageInputRef = ref<ComponentPublicInstance | null>(null)
const fullscreenImageUrl = ref<string | null>(null)

let socket: Socket | null = null
let joinedForumId: number | null = null
let typingTimer: ReturnType<typeof setTimeout> | null = null
let isTyping = false

const isForumIdValid = computed(
	() => Number.isFinite(currentForumId.value) && currentForumId.value > 0,
)

const me = computed(() => authStore.user)
const isLargeScreen = ref(false)

const activeTypingName = computed(() => {
	return typingUsers.value[0] ?? ''
})

let largeScreenMediaQuery: MediaQueryList | null = null

function getTypingUsername(payload: TypingPayload): string {
	return (
		payload.username ??
		payload.userName ??
		payload.authorName ??
		''
	).trim()
}

function handleLargeScreenBreakpointChange(event: MediaQueryListEvent): void {
	isLargeScreen.value = event.matches
}

function setupLargeScreenBreakpointWatcher(): void {
	if (typeof window === 'undefined') {
		return
	}

	largeScreenMediaQuery = window.matchMedia('(min-width: 1024px)')
	isLargeScreen.value = largeScreenMediaQuery.matches

	if (typeof largeScreenMediaQuery.addEventListener === 'function') {
		largeScreenMediaQuery.addEventListener('change', handleLargeScreenBreakpointChange)
		return
	}

	largeScreenMediaQuery.addListener(handleLargeScreenBreakpointChange)
}

function teardownLargeScreenBreakpointWatcher(): void {
	if (!largeScreenMediaQuery) {
		return
	}

	if (typeof largeScreenMediaQuery.removeEventListener === 'function') {
		largeScreenMediaQuery.removeEventListener('change', handleLargeScreenBreakpointChange)
		largeScreenMediaQuery = null
		return
	}

	largeScreenMediaQuery.removeListener(handleLargeScreenBreakpointChange)
	largeScreenMediaQuery = null
}

function getMessageInputElement(): HTMLInputElement | null {
	const element = messageInputRef.value?.$el
	return element instanceof HTMLInputElement ? element : null
}

function onEmojiSelect(unicode: string): void {
	if (!unicode) {
		return
	}

	const inputElement = getMessageInputElement()
	const start = inputElement?.selectionStart ?? messageInput.value.length
	const end = inputElement?.selectionEnd ?? messageInput.value.length

	messageInput.value =
		messageInput.value.slice(0, start) +
		unicode +
		messageInput.value.slice(end)
	handleTypingInput()

	nextTick(() => {
		if (!inputElement) {
			return
		}

		const cursor = start + unicode.length
		inputElement.focus()
		inputElement.setSelectionRange(cursor, cursor)
	})
}

function normalizeForumState(
	payload: ForumStatePayload | LegacyForumStatePayload,
): ForumStatePayload {
	const participants = (payload.participants ?? []).map((participant, index) => {
		if (typeof participant === 'string') {
			return {
				id: -(index + 1),
				username: participant,
				avatarUrl: null,
			}
		}

		const normalizedParticipantId = Number(participant.id)

		return {
			id: Number.isFinite(normalizedParticipantId) ? normalizedParticipantId : -(index + 1),
			username: participant.username,
			avatarUrl: participant.avatarUrl ?? null,
		}
	})

	const normalizedMessages = (payload.messages ?? []).map((message) => ({
		id: message.id,
		text: message.text,
		imageUrl:
			typeof (message as ForumMessage).imageUrl === 'string' ||
			(message as ForumMessage).imageUrl === null
				? (message as ForumMessage).imageUrl
				: null,
		authorId:
			typeof (message as ForumMessage).authorId === 'number'
				? (message as ForumMessage).authorId
				: -1,
		authorName: message.authorName,
		authorAvatarUrl:
			typeof (message as ForumMessage).authorAvatarUrl === 'string' ||
			(message as ForumMessage).authorAvatarUrl === null
				? (message as ForumMessage).authorAvatarUrl
				: null,
		isPrivate: (message as ForumMessage).isPrivate === true,
		recipientId: (message as ForumMessage).recipientId ?? null,
		recipientName: (message as ForumMessage).recipientName ?? null,
		createdAt: message.createdAt,
	}))

	return {
		id: Number((payload as ForumStatePayload).id ?? currentForumId.value),
		name: payload.name,
		description: payload.description ?? null,
		creatorName: (payload as ForumStatePayload).creatorName ?? '-',
		participants,
		messages: normalizedMessages,
	}
}

function normalizeIncomingMessage(rawMessage: ForumMessage): ForumMessage {
	return {
		id: Number(rawMessage.id),
		text: `${rawMessage.text ?? ''}`,
		imageUrl:
			typeof rawMessage.imageUrl === 'string' || rawMessage.imageUrl === null
				? rawMessage.imageUrl
				: null,
		authorId: Number(rawMessage.authorId),
		authorName: `${rawMessage.authorName ?? ''}`,
		authorAvatarUrl:
			typeof rawMessage.authorAvatarUrl === 'string' || rawMessage.authorAvatarUrl === null
				? rawMessage.authorAvatarUrl
				: null,
		isPrivate: rawMessage.isPrivate === true,
		recipientId:
			typeof rawMessage.recipientId === 'number' ? rawMessage.recipientId : null,
		recipientName:
			typeof rawMessage.recipientName === 'string' ? rawMessage.recipientName : null,
		createdAt: `${rawMessage.createdAt}`,
	}
}

function sendImageMessage(imageDataUrl: string): void {
	if (!socket || !isForumIdValid.value) {
		return
	}

	if (privateRecipient.value) {
		socket.emit('send_message', {
			forumId: currentForumId.value,
			recipientId: privateRecipient.value.id,
			imageUrl: imageDataUrl,
		})
		return
	}

	socket.emit('send_message', {
		forumId: currentForumId.value,
		imageUrl: imageDataUrl,
	})
}

function openFullscreenImage(imageUrl: string | null): void {
	if (!imageUrl) {
		return
	}

	fullscreenImageUrl.value = imageUrl
}

function isOwnMessage(message: ForumMessage): boolean {
	if (!me.value) {
		return false
	}
	return message.authorName === me.value.username
}

function isCurrentUserParticipant(participant: ForumParticipant): boolean {
	if (!me.value) {
		return false
	}

	return participant.username.trim().toLowerCase() === me.value.username.trim().toLowerCase()
}

function formatMessageTime(value: string): string {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return '--:--'
	}

	return new Intl.DateTimeFormat('pt-BR', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(date)
}

async function scrollMessagesToBottom(smooth = false): Promise<void> {
	await nextTick()

	const container = messagesContainerRef.value
	if (!container) {
		return
	}

	container.scrollTo({
		top: container.scrollHeight,
		behavior: smooth ? 'smooth' : 'auto',
	})
}

async function loadOtherForums(): Promise<void> {
	isLoadingForums.value = true

	try {
		const response = await apiFetch(`/forums/${currentForumId.value}/sidebar?count=7`, {
			method: 'GET',
		})

		const data = (await response.json()) as
			| ApiSuccessResponse<ForumCardItem[]>
			| ApiErrorResponse

		if (!response.ok || !data.success) {
			throw new Error(data.message ?? 'Falha ao carregar foruns')
		}

		otherForums.value = data.data
	} catch {
		otherForums.value = []
	}
	finally {
		isLoadingForums.value = false
	}
}

async function loadForumSnapshot(): Promise<void> {
	if (!isForumIdValid.value) {
		return
	}

	isLoadingForum.value = true
	errorMessage.value = null

	try {
		const response = await apiFetch(`/forums/${currentForumId.value}`, {
			method: 'GET',
		})

		if (response.status === 404) {
			await router.replace('/forums')
			return
		}

		const data = (await response.json()) as
			| ApiSuccessResponse<ForumStatePayload | LegacyForumStatePayload>
			| ApiErrorResponse

		if (!response.ok || !data.success) {
			throw new Error(data.message ?? 'Falha ao carregar mensagens')
		}

		const state = normalizeForumState(data.data)
		forumName.value = state.name
		forumDescription.value = state.description
		forumCreatorName.value = state.creatorName
		allParticipants.value = state.participants
		messages.value = state.messages
		isLoadingForum.value = false

		await scrollMessagesToBottom()
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : 'Falha ao carregar mensagens'
		isLoadingForum.value = false
	}
}

function clearTypingTimeout(): void {
	if (typingTimer) {
		clearTimeout(typingTimer)
		typingTimer = null
	}
}

function resolveActiveParticipantByUsername(username: string): ForumParticipant | null {
	const normalizedUsername = username.trim().toLowerCase()

	const activeParticipant = allParticipants.value.find((participant) => {
		return (
			participant.username.trim().toLowerCase() === normalizedUsername &&
			Number.isFinite(Number(participant.id)) &&
			Number(participant.id) > 0
		)
	})

	if (activeParticipant) {
		return activeParticipant
	}

	const onlineParticipant = onlineParticipants.value.find((participant) => {
		return (
			participant.username.trim().toLowerCase() === normalizedUsername &&
			Number.isFinite(Number(participant.id)) &&
			Number(participant.id) > 0
		)
	})

	return onlineParticipant ?? null
}

function emitTypingStop(): void {
	if (!socket || !isTyping || !isForumIdValid.value) {
		return
	}

	socket.emit('typing_stop', { forumId: currentForumId.value })
	isTyping = false
}

function scheduleTypingStop(): void {
	clearTypingTimeout()
	typingTimer = setTimeout(() => {
		emitTypingStop()
	}, 900)
}

function handleTypingInput(): void {
	if (!socket || !isForumIdValid.value) {
		return
	}

	if (!messageInput.value.trim()) {
		emitTypingStop()
		return
	}

	if (!isTyping) {
		socket.emit('typing_start', { forumId: currentForumId.value })
		isTyping = true
	}

	scheduleTypingStop()
}

function setupSocket(): void {
	if (socket) {
		return
	}

	const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
	socket = io(`${apiBase}/chat`, {
		withCredentials: true,
	})

	socket.on('connect', () => {
		if (isForumIdValid.value) {
			errorMessage.value = null
			socket?.emit('join_forum', { forumId: currentForumId.value })
			joinedForumId = currentForumId.value
		}
	})

	socket.on('connect_error', () => {
		if (isLoadingForum.value) {
			isLoadingForum.value = false
		}

		if (!errorMessage.value) {
			errorMessage.value = 'Nao foi possivel conectar ao chat em tempo real.'
		}
	})

	socket.on('disconnect', () => {
		if (!errorMessage.value) {
			errorMessage.value = 'Conexao do chat encerrada.'
		}
	})

	socket.on('forum_state', async (rawPayload: ForumStatePayload | LegacyForumStatePayload) => {
		const payload = normalizeForumState(rawPayload)
		if (payload.id !== currentForumId.value && joinedForumId !== currentForumId.value) {
			return
		}

		forumName.value = payload.name
		forumDescription.value = payload.description
		forumCreatorName.value = payload.creatorName
		allParticipants.value = payload.participants
		messages.value = payload.messages
		isLoadingForum.value = false
		errorMessage.value = null

		await scrollMessagesToBottom()
	})

	socket.on('forum_message_created', async (message: ForumMessage) => {
		const normalizedMessage = normalizeIncomingMessage(message)

		if (messages.value.some((currentMessage) => currentMessage.id === normalizedMessage.id)) {
			return
		}

		messages.value.push(normalizedMessage)
		await scrollMessagesToBottom(true)
	})

	socket.on('participants_online', (payload: ParticipantsOnlinePayload) => {
		if (Number(payload.forumId) !== currentForumId.value) {
			return
		}

		onlineParticipants.value = (payload.users ?? []).map((participant, index) => {
			const normalizedParticipantId = Number(participant.id)

			return {
				id: Number.isFinite(normalizedParticipantId) ? normalizedParticipantId : -(index + 1),
				username: participant.username,
				avatarUrl: participant.avatarUrl ?? null,
			}
		})
	})

	socket.on('typing_start', (payload: TypingPayload) => {
		if (Number(payload.forumId) !== currentForumId.value) {
			return
		}

		const username = getTypingUsername(payload)
		if (!username) {
			return
		}

		if (!typingUsers.value.includes(username)) {
			typingUsers.value = [...typingUsers.value, username]
		}
	})

	socket.on('typing_stop', (payload: TypingPayload) => {
		if (Number(payload.forumId) !== currentForumId.value) {
			return
		}

		const username = getTypingUsername(payload)
		if (!username) {
			return
		}

		typingUsers.value = typingUsers.value.filter(
			(currentUsername) =>
				currentUsername.toLowerCase() !== username.toLowerCase(),
		)
	})

	socket.on('chat_error', (payload: ChatErrorPayload) => {
		errorMessage.value = payload.message || 'Falha na conexao do chat'
		isLoadingForum.value = false

		if (payload.message.toLowerCase().includes('nao encontrado')) {
			router.replace('/forums')
		}
	})
}

function joinForum(forumId: number): void {
	if (!socket) {
		return
	}

	if (joinedForumId && joinedForumId !== forumId) {
		socket.emit('leave_forum', { forumId: joinedForumId })
	}

	onlineParticipants.value = []
	typingUsers.value = []
	isLoadingForum.value = true
	errorMessage.value = null

	socket.emit('join_forum', { forumId })
	joinedForumId = forumId
}

async function sendMessage(): Promise<void> {
	const text = messageInput.value.trim()

	if (!text || !socket || !isForumIdValid.value) {
		return
	}

	if (privateRecipient.value) {
		socket.emit('send_message', {
			forumId: currentForumId.value,
			recipientId: privateRecipient.value.id,
			text,
		})
	} else {
		socket.emit('send_message', {
			forumId: currentForumId.value,
			text,
		})
	}

	messageInput.value = ''
	emitTypingStop()
	clearTypingTimeout()
}

function setPrivateRecipient(participant: ForumParticipant): void {
	const parsedRecipientId = Number(participant.id)
	let recipientId =
		Number.isFinite(parsedRecipientId) && parsedRecipientId > 0
			? parsedRecipientId
			: null
	let resolvedParticipant: ForumParticipant | null = null

	if (recipientId !== null) {
		resolvedParticipant = {
			id: recipientId,
			username: participant.username,
			avatarUrl: participant.avatarUrl ?? null,
		}
	}

	if (recipientId === null) {
		const candidate = resolveActiveParticipantByUsername(participant.username)

		if (candidate) {
			recipientId = Number(candidate.id)
			resolvedParticipant = {
				id: recipientId,
				username: candidate.username,
				avatarUrl: candidate.avatarUrl ?? participant.avatarUrl ?? null,
			}
		}
	}

	if (recipientId === null || resolvedParticipant === null) {
		errorMessage.value = 'Nao foi possivel iniciar mensagem privada para este usuario.'
		return
	}

	if (me.value && resolvedParticipant.username === me.value.username) {
		return
	}

	privateRecipient.value = resolvedParticipant
	errorMessage.value = null
	nextTick(() => getMessageInputElement()?.focus())
}

function clearPrivateRecipient(): void {
	privateRecipient.value = null
}

function handleInputKeydown(event: KeyboardEvent): void {
	if (event.key === 'Enter') {
		event.preventDefault()
		void sendMessage()
	} else if (event.key === 'Escape') {
		clearPrivateRecipient()
	}
}

function openForum(forumId: number): void {
	router.push({ name: 'forum', params: { id: String(forumId) } })
}

watch(
	() => currentForumId.value,
	async (forumId) => {
		if (!Number.isFinite(forumId) || forumId <= 0) {
			await router.replace('/forums')
			return
		}

		await loadOtherForums()
		await loadForumSnapshot()

		if (socket?.connected) {
			joinForum(forumId)
		}
	},
)

onMounted(async () => {
	setupLargeScreenBreakpointWatcher()

	if (!isForumIdValid.value) {
		await router.replace('/forums')
		return
	}

	await loadOtherForums()
	await loadForumSnapshot()
	setupSocket()
})

onBeforeUnmount(() => {
	teardownLargeScreenBreakpointWatcher()

	emitTypingStop()
	clearTypingTimeout()

	if (socket && joinedForumId) {
		socket.emit('leave_forum', { forumId: joinedForumId })
	}

	socket?.disconnect()
	socket = null
	joinedForumId = null
})
</script>

<template>
	<div class="h-auto lg:h-[calc(100vh-10rem)]">
		<div class="mb-3 flex items-center justify-between">
      <Button class="text-text-color-54 cursor-pointer bg-transparent hover:bg-transparent hover:text-text-color-25" @click="$router.push('/forums')">
        <p class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-icon lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Voltar para o dashboard
        </p>
      </Button>

		</div>

		<div class="forum-layout grid h-full grid-cols-1 gap-4" :style="forumLayoutStyle">
			<aside
				:aria-hidden="!isParticipantsVisible"
				:class="[
					'participants-panel order-1 min-w-0 overflow-hidden rounded-xl border border-border bg-background-color shadow-sm transition-[max-height,opacity,transform] duration-300 ease-in-out',
					isParticipantsVisible
						? 'max-h-[40rem] lg:max-h-none translate-y-0 lg:translate-y-0 lg:translate-x-0 opacity-100 pointer-events-auto'
						: 'max-h-0 lg:max-h-none -translate-y-4 lg:translate-y-0 lg:-translate-x-8 opacity-0 pointer-events-none',
				]"
			>
				<div class="mb-3 flex items-center justify-between rounded-t-xl px-4 py-6 shadow-md rounded-b-none">
					<h2 class="font-bold text-primary-dark-color">Participantes online</h2>
					<span class="text-xs text-text-color-54">{{ onlineParticipants.length }}</span>
				</div>

				<ul class="space-y-2 p-4">
					<li
						v-for="participant in onlineParticipants"
						:key="participant.id"
						class="group relative flex items-center gap-2 rounded-xl p-2 pr-8 transition-colors hover:bg-text-color-25/30"
					>
            <Avatar
              class="size-10"
              aria-label="Imagem do usuário"
              tabindex="0"
            >
              <AvatarImage :src="participant.avatarUrl ? participant.avatarUrl : ''" alt="profile-picture" />
              <AvatarFallback class="border border-text-color-25/30">{{ getUserInitials(participant.username) }}</AvatarFallback>
            </Avatar>
						<p class="truncate text-sm text-text-color-54">{{ participant.username }}</p>
						<span
							v-if="!isCurrentUserParticipant(participant)"
							class="pointer-events-none opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
						>
							<svg @click="setPrivateRecipient(participant)" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cursor-pointer text-primary-dark-color transition-colors hover:text-primary-default-color"><path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"/></svg>
						</span>
					</li>
				</ul>
				<p v-if="!onlineParticipants.length" class="mt-4 text-sm text-text-color-54">
					Ninguem online no momento.
				</p>
			</aside>

			<section class="order-2 relative flex h-[calc(100dvh-10rem)] min-h-0 min-w-0 flex-col rounded-xl border border-border bg-background-color shadow-sm lg:h-full">
				<header class="flex items-center justify-between border-b border-border shadow-md px-4 py-5">
          <div class="flex flex-items gap-4">
						<button
							:aria-expanded="isParticipantsVisible"
							:aria-label="isParticipantsVisible ? 'Ocultar participantes online' : 'Mostrar participantes online'"
							class="mt-1 flex cursor-pointer items-center text-primary-dark-color transition-colors hover:text-primary-default-color"
              type="button"
              @click="isParticipantsVisible = !isParticipantsVisible"
            >
              <svg v-if="isParticipantsVisible" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left-icon lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
						</button>
            <h1 class="text-base md:text-xl lg:text-xl xl:text-2xl font-bold text-primary-dark-color">{{ forumName || 'Forum' }}</h1>
          </div>
          <div class="md:flex items-center gap-1 text-xs md:text-sm xl:text-md text-primary-dark-color">
            <p>Criado por:</p>
            <p class="font-bold">{{ forumCreatorName || '-' }}</p>
          </div>
				</header>

				<div ref="messagesContainerRef" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-4 pb-8">
					<p v-if="isLoadingForum" class="text-sm text-text-color-54">Carregando mensagens...</p>
					<p v-else-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

					<article
						v-for="message in messages"
						:key="message.id"
						:class="[
							'max-w-[80%] rounded-xl p-3',
							message.isPrivate
								? 'bg-secondary-dark-color text-white ' + (isOwnMessage(message) ? 'ml-auto' : '')
								: isOwnMessage(message)
									? 'ml-auto bg-primary-dark-color text-white'
									: 'bg-background-color text-text-color-54',
						]"
					>
            <div class="flex flex-items gap-3">
              <div class="flex">
                <Avatar
                  class="size-10"
                  aria-label="Imagem do usuário"
                  tabindex="0"
                >
                  <AvatarImage :src="message.authorAvatarUrl ? message.authorAvatarUrl : ''" alt="profile-picture" />
                  <AvatarFallback class="border border-text-color-25/30">{{ getUserInitials(message.authorName) }}</AvatarFallback>
                </Avatar>
              </div>
              <div class="mt-3 group">
                <div class="flex gap-2">
                  <p class="mb-1 text-xs opacity-80">{{ message.authorName }}</p>
                  <span v-if="!isOwnMessage(message)" class="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                    <svg @click="setPrivateRecipient({ id: message.authorId, username: message.authorName, avatarUrl: message.authorAvatarUrl })" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="['cursor-pointer transition-colors', message.isPrivate ? 'text-primary-dark-color hover:text-primary-default-color' : 'text-secondary-dark-color hover:text-secondary-default-color']"><path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"/></svg>
                  </span>
                </div>
								<p v-if="message.text" class="whitespace-pre-wrap text-sm">{{ message.text }}</p>
								<img
									v-if="message.imageUrl"
									:src="message.imageUrl"
									alt="Imagem enviada no chat"
									class="mt-2 max-h-72 w-full cursor-pointer rounded-xl object-cover"
									@click="openFullscreenImage(message.imageUrl)"
								>
                <p class="mt-1 text-right text-[10px] opacity-75">{{ formatMessageTime(message.createdAt) }}</p>
              </div>
            </div>
					</article>

					<p v-if="!isLoadingForum && !messages.length" class="text-sm text-text-color-54">
						Nenhuma mensagem ainda. Seja o primeiro a enviar.
					</p>
				</div>

				<p v-if="activeTypingName" class="pointer-events-none absolute bottom-36 left-5 z-20 text-xs text-text-color-25">
					{{ `${activeTypingName} está digitando...` }}
				</p>

				<div :class="['border-t border-border py-5 px-4 rounded-b-xl transition-colors duration-300', privateRecipient ? 'bg-secondary-dark-color' : 'bg-primary-dark-color']">
          <div class="flex flex-items justify-between px-2 pt-2 pb-4">
            <div class="flex items-center gap-2">
              <p class="text-xs font-bold text-white">
                {{ privateRecipient ? `Enviando para ${privateRecipient.username}` : 'Enviando para todos do 4um' }}
              </p>
              <button
                v-if="privateRecipient"
                type="button"
                class="flex items-center text-xs  justify-center rounded-full text-text-color-25 hover:text-white transition-colors cursor-pointer"
                :aria-label="`Cancelar mensagem privada para ${privateRecipient.username}`"
                @click="clearPrivateRecipient"
              >
                Cancelar envio de mensagem privada
              </button>
            </div>
            <div class="flex flex-items gap-2 text-white">
							<ForumEmojiPicker @select="onEmojiSelect" />
							<DragOrDropImage @select="sendImageMessage" />
            </div>
          </div>
					<div class="relative">
						<Input
							ref="messageInputRef"
							v-model="messageInput"
							class="h-12 bg-white rounded-full"
							type="text"
							:placeholder="isLargeScreen ? 'Escreva aqui uma mensagem maneira para mandar para os colegas...' : 'Escreva aqui uma mensagem...'"
							@input="handleTypingInput"
							@blur="emitTypingStop"
						@keydown="handleInputKeydown"
						/>
						<Button
							class="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-transparent p-0 text-black hover:bg-primary-default-color/15 cursor-pointer"
							type="button"
							:disabled="!messageInput.trim()"
							@click="sendMessage"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-send-horizontal-icon lucide-send-horizontal"
							>
								<path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z" />
								<path d="M6 12h16" />
							</svg>
						</Button>
					</div>
				</div>
			</section>

			<aside class="order-3">
				<div v-if="isLoadingForums" class="text-sm text-text-color-54">Carregando...</div>

				<div v-else class="grid grid-cols-2 gap-2 lg:grid-cols-1">
					<button
						v-for="forum in otherForums"
						:key="forum.id"
						type="button"
						:class="[
							'w-full rounded-xl shadow-md border border-border p-3 pt-4 text-left transition-colors cursor-pointer',
							forum.id === currentForumId
								? 'bg-primary-dark-color text-white hover:bg-primary-default-color'
								: 'bg-background-color hover:bg-white/50',
						]"
						@click="openForum(forum.id)"
					>
						<p :class="['truncate font-bold', forum.id === currentForumId ? 'text-white' : 'text-primary-default-color']">{{ forum.name }}</p>
						<p :class="['mt-1 text-xs', forum.id === currentForumId ? 'text-white/85' : 'text-text-color-54']">
							{{ forum.lastCommentAuthorName || forum.creatorName }} +{{ forum.participantsCount }} {{ forum.participantsCount === 1 ? 'pessoa' : 'pessoas' }}
						</p>
					</button>

					<p v-if="!otherForums.length" class="text-sm text-text-color-54">
						Nao há outros fórums disponíveis.
					</p>
				</div>
			</aside>
		</div>

		<FullscreenImage v-model="fullscreenImageUrl" />
	</div>
</template>

<style scoped>
.forum-layout {
	grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 1024px) {
	.forum-layout {
		grid-template-columns: var(--participants-column-size, 16rem) minmax(0, 1fr) 12rem;
		transition: grid-template-columns 300ms ease;
	}
}
</style>
