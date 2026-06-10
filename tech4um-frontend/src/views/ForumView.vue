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

const activeTypingName = computed(() => {
	return typingUsers.value[0] ?? ''
})

function getTypingUsername(payload: TypingPayload): string {
	return (
		payload.username ??
		payload.userName ??
		payload.authorName ??
		''
	).trim()
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

		return {
			id: participant.id,
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

function sendImageMessage(imageDataUrl: string): void {
	if (!socket || !isForumIdValid.value) {
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
		messages.value.push(message)
		await scrollMessagesToBottom(true)
	})

	socket.on('participants_online', (payload: ParticipantsOnlinePayload) => {
		if (Number(payload.forumId) !== currentForumId.value) {
			return
		}

		onlineParticipants.value = payload.users
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

	socket.emit('send_message', {
		forumId: currentForumId.value,
		text,
	})

	messageInput.value = ''
	emitTypingStop()
	clearTypingTimeout()
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
	if (!isForumIdValid.value) {
		await router.replace('/forums')
		return
	}

	await loadOtherForums()
	await loadForumSnapshot()
	setupSocket()
})

onBeforeUnmount(() => {
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
	<div class="h-[calc(100vh-10rem)]">
		<div class="mb-3 flex items-center justify-between">
      <Button class="text-text-color-54 cursor-pointer bg-transparent hover:bg-transparent hover:text-text-color-25" @click="$router.push('/forums')">
        <p class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-icon lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Voltar para o dashboard
        </p>
      </Button>
			<!-- <Button
				class="bg-primary-dark-color hover:bg-primary-default-color"
				type="button"
				@click="isParticipantsVisible = !isParticipantsVisible"
			>
				{{ isParticipantsVisible ? 'Ocultar participantes' : 'Mostrar participantes' }}
			</Button> -->
		</div>

		<div class="grid h-full grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_12rem]">
			<aside
				v-show="isParticipantsVisible"
				class="rounded-xl border border-border bg-background-color shadow-sm"
			>
				<div class="mb-3 flex items-center justify-between rounded-t-xl px-4 py-6 shadow-md rounded-b-none">
					<h2 class="font-bold text-primary-dark-color">Participantes online</h2>
					<span class="text-xs text-text-color-54">{{ onlineParticipants.length }}</span>
				</div>

				<ul class="space-y-2 p-4">
					<li
						v-for="participant in onlineParticipants"
						:key="participant.id"
						class="flex items-center gap-2 rounded-xl p-2 hover:bg-text-color-25/30 transition-colors"
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
					</li>
				</ul>
				<p v-if="!onlineParticipants.length" class="mt-4 text-sm text-text-color-54">
					Ninguem online no momento.
				</p>
			</aside>

			<section class="relative flex min-h-0 flex-col rounded-xl border border-border bg-background-color shadow-sm">
				<header class="flex items-center justify-between border-b border-border shadow-md px-4 py-5">
					<h1 class="text-2xl font-bold text-primary-dark-color">{{ forumName || 'Forum' }}</h1>
          <div class="flex items-center gap-1 text-md text-primary-dark-color">
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
							isOwnMessage(message)
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
              <div class="mt-3">
                <p class="mb-1 text-xs opacity-80">{{ message.authorName }}</p>
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

				<div class="border-t border-border py-5 px-4 bg-primary-dark-color rounded-b-xl">
          <div class="flex flex-items justify-between px-2 pt-2 pb-4">
            <p class="text-xs font-bold text-white">Enviando para todos do 4um</p>
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
							placeholder="Escreva aqui uma mensagem maneira para mandar para os colegas..."
							@input="handleTypingInput"
							@blur="emitTypingStop"
							@keydown.enter.prevent="sendMessage"
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

			<aside>
				<div v-if="isLoadingForums" class="text-sm text-text-color-54">Carregando...</div>

				<div v-else class="space-y-2">
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
