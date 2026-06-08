<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CreateForum from '@/components/CreateForum.vue'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useAuthModalStore } from '@/stores/auth-modal'

interface ForumItem {
  id: number
  name: string
  description: string | null
  creatorName: string
  messagesCount: number
  participantsCount: number
  lastCommentAuthorName: string | null
}

interface CreateForumPayload {
  name: string
  description?: string
}

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

const router = useRouter()
const authStore = useAuthStore()
const authModalStore = useAuthModalStore()

const PAGE_SIZE = 5

const forums = ref<ForumItem[]>([])
const isLoadingForums = ref(false)
const forumsErrorMessage = ref<string | null>(null)
const searchTerm = ref('')
const currentPage = ref(1)
const totalPages = ref(1)

const isCreateModalOpen = ref(false)
const isCreatingForum = ref(false)
const createForumErrorMessage = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchTerm, (newVal) => {
  if (newVal.trim() !== '') return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    currentPage.value = 1
    await listAllForums('')
  }, 2000)
})

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

async function listAllForums(search?: string, page = currentPage.value): Promise<void> {
  isLoadingForums.value = true
  forumsErrorMessage.value = null

  try {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })

    if (search?.trim()) {
      query.set('search', search.trim())
    }

    const response = await apiFetch(`/forums?${query.toString()}`, {
      method: 'GET',
    })

    const data = (await response.json()) as
      | ApiSuccessResponse<ForumItem[]>
      | ApiErrorResponse

    if (!response.ok || !data.success) {
      throw new Error(getApiErrorMessage(data, 'Falha ao listar foruns'))
    }

    forums.value = data.data
    currentPage.value = data.meta?.page ?? page
    totalPages.value = data.meta?.totalPages ?? 1

  } catch (error) {
    forums.value = []
    forumsErrorMessage.value =
      error instanceof Error ? error.message : 'Falha ao listar foruns'
  } finally {
    isLoadingForums.value = false
  }
}

async function createForum(payload: CreateForumPayload): Promise<void> {
  isCreatingForum.value = true
  createForumErrorMessage.value = null

  try {
    const response = await apiFetch('/forums', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = (await response.json()) as
      | ApiSuccessResponse<unknown>
      | ApiErrorResponse

    if (!response.ok || !data.success) {
      throw new Error(getApiErrorMessage(data, 'Falha ao criar forum'))
    }

    isCreateModalOpen.value = false
    await listAllForums(searchTerm.value)
  } catch (error) {
    createForumErrorMessage.value =
      error instanceof Error ? error.message : 'Falha ao criar forum'
  } finally {
    isCreatingForum.value = false
  }
}

function openCreateForumModal() {
  if (!authStore.isAuthenticated) {
    authModalStore.openLogin()
    return
  }

  createForumErrorMessage.value = null
  isCreateModalOpen.value = true
}

function openForum(forumId: number) {
  if (!authStore.isAuthenticated) {
    authModalStore.openLogin()
    return
  }

  router.push({ name: 'forum', params: { id: String(forumId) } })
}

async function handleSearchSubmit() {
  if (debounceTimer) clearTimeout(debounceTimer)
  currentPage.value = 1
  await listAllForums(searchTerm.value, 1)
}

async function goToPage(page: number): Promise<void> {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  await listAllForums(searchTerm.value, page)
}

onMounted(async () => {
  await listAllForums()
})
</script>

<template>
  <div class="pb-8">
    <p class="text-2xl text-text-color-54">Opa!</p>
    <p class="font-bold text-lg text-text-color-54">Sobre o que gostaria de falar hoje?</p>
  </div>

  <div class="flex flex-items gap-4">
    <div class="min-w-0 flex-1">
      <form class="relative w-full" @submit.prevent="handleSearchSubmit">
        <Input
          v-model="searchTerm"
          class="h-10 w-full"
          type="text"
          placeholder="Em busca de uma sala? Encontre-a aqui"
        />
        <span
          v-if="!searchTerm"
          class="pointer-events-none absolute left-[16.6rem] top-1/2 -translate-y-1/2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.2 0.800001C12.6697 0.800425 12.1612 1.01127 11.7863 1.38626C11.4113 1.76124 11.2004 2.2697 11.2 2.8C11.2 3.0856 11.2624 3.3568 11.3712 3.604L9.8072 5.3632C9.27589 4.99646 8.64559 4.80003 8 4.8C7.408 4.8 6.8608 4.9728 6.3848 5.2528L4.5656 3.4344L4.5472 3.4528C4.704 3.1344 4.8 2.78 4.8 2.4C4.8 1.92533 4.65924 1.46131 4.39553 1.06663C4.13181 0.671955 3.75698 0.36434 3.31844 0.18269C2.8799 0.00103989 2.39734 -0.0464881 1.93178 0.0461164C1.46623 0.138721 1.03859 0.367299 0.702945 0.702945C0.367299 1.03859 0.138721 1.46623 0.0461164 1.93178C-0.0464881 2.39734 0.00103989 2.8799 0.18269 3.31844C0.36434 3.75698 0.671954 4.13181 1.06663 4.39553C1.46131 4.65924 1.92533 4.8 2.4 4.8C2.78 4.8 3.1336 4.704 3.4528 4.5472L3.4344 4.5656L5.2536 6.384C4.95971 6.87202 4.803 7.43033 4.8 8C4.8 8.7976 5.104 9.5192 5.588 10.0808L3.5264 12.1416C3.29534 12.0491 3.04889 12.0011 2.8 12C1.6976 12 0.800001 12.8968 0.800001 14C0.800001 15.1032 1.6976 16 2.8 16C3.9024 16 4.8 15.1032 4.8 14C4.8 13.7432 4.7472 13.4992 4.6584 13.2728L6.9288 11.0024C7.2656 11.1224 7.6224 11.2 8 11.2C9.7648 11.2 11.2 9.7648 11.2 8C11.2 7.4912 11.0696 7.0168 10.8576 6.5888L12.5512 4.6824C12.756 4.7528 12.972 4.8 13.2 4.8C14.3032 4.8 15.2 3.9032 15.2 2.8C15.2 1.6968 14.3032 0.800001 13.2 0.800001ZM8 9.6C7.1176 9.6 6.4 8.8824 6.4 8C6.4 7.1176 7.1176 6.4 8 6.4C8.8824 6.4 9.6 7.1176 9.6 8C9.6 8.8824 8.8824 9.6 8 9.6Z" fill="white"/>
            <path d="M13.2 0.800001C12.6697 0.800425 12.1612 1.01127 11.7863 1.38626C11.4113 1.76124 11.2004 2.2697 11.2 2.8C11.2 3.0856 11.2624 3.3568 11.3712 3.604L9.8072 5.3632C9.27589 4.99646 8.64559 4.80003 8 4.8C7.408 4.8 6.8608 4.9728 6.3848 5.2528L4.5656 3.4344L4.5472 3.4528C4.704 3.1344 4.8 2.78 4.8 2.4C4.8 1.92533 4.65924 1.46131 4.39553 1.06663C4.13181 0.671955 3.75698 0.36434 3.31844 0.18269C2.8799 0.00103989 2.39734 -0.0464881 1.93178 0.0461164C1.46623 0.138721 1.03859 0.367299 0.702945 0.702945C0.367299 1.03859 0.138721 1.46623 0.0461164 1.93178C-0.0464881 2.39734 0.00103989 2.8799 0.18269 3.31844C0.36434 3.75698 0.671954 4.13181 1.06663 4.39553C1.46131 4.65924 1.92533 4.8 2.4 4.8C2.78 4.8 3.1336 4.704 3.4528 4.5472L3.4344 4.5656L5.2536 6.384C4.95971 6.87202 4.803 7.43033 4.8 8C4.8 8.7976 5.104 9.5192 5.588 10.0808L3.5264 12.1416C3.29534 12.0491 3.04889 12.0011 2.8 12C1.6976 12 0.800001 12.8968 0.800001 14C0.800001 15.1032 1.6976 16 2.8 16C3.9024 16 4.8 15.1032 4.8 14C4.8 13.7432 4.7472 13.4992 4.6584 13.2728L6.9288 11.0024C7.2656 11.1224 7.6224 11.2 8 11.2C9.7648 11.2 11.2 9.7648 11.2 8C11.2 7.4912 11.0696 7.0168 10.8576 6.5888L12.5512 4.6824C12.756 4.7528 12.972 4.8 13.2 4.8C14.3032 4.8 15.2 3.9032 15.2 2.8C15.2 1.6968 14.3032 0.800001 13.2 0.800001ZM8 9.6C7.1176 9.6 6.4 8.8824 6.4 8C6.4 7.1176 7.1176 6.4 8 6.4C8.8824 6.4 9.6 7.1176 9.6 8C9.6 8.8824 8.8824 9.6 8 9.6Z" fill="black" fill-opacity="0.25"/>
          </svg>
        </span>
        <Button
          class="absolute right-0 top-0 h-full bg-primary-dark-color px-3 hover:bg-primary-default-color cursor-pointer"
          type="submit"
          :disabled="isLoadingForums"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </Button>
      </form>
    </div>
    <div>
      <Button
        class="h-10 bg-primary-dark-color cursor-pointer hover:bg-primary-default-color"
        type="button"
        @click="openCreateForumModal"
      >
        Ou crie seu proprio 4um
      </Button>
    </div>
  </div>

  <div class="mt-8">
    <p v-if="isLoadingForums" class="text-text-color-54">Carregando foruns...</p>
    <p v-else-if="forumsErrorMessage" class="text-red-600">{{ forumsErrorMessage }}</p>

    <div v-else-if="forums.length" class="grid grid-cols-1 items-start gap-4 md:grid-cols-4">
      <article
        v-for="forum in forums"
        :key="forum.id"
        :class="[
          'rounded-xl border border-border bg-background-color p-5 shadow-md cursor-pointer transition-colors hover:bg-white/50',
          forum.messagesCount >= 1 ? 'md:col-span-2' : 'md:col-span-1',
        ]"
        @click="openForum(forum.id)"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <div class="min-w-0 w-full mb-1">
            <p
              v-if="forum.messagesCount >= 1"
              class="text-secondary-default-color text-sm font-bold italic mb-1"
            >
              Tópico em destaque!
            </p>
            <p :class="['w-full overflow-hidden text-ellipsis whitespace-nowrap font-bold', forum.messagesCount >= 1 ? 'text-xl text-primary-dark-color' : 'text-md text-primary-default-color']">{{ forum.name }}</p>
            <p class="text-xs text-text-color-54">{{ forum.lastCommentAuthorName }} +{{ forum.participantsCount - 1 }} {{ forum.participantsCount === 2 ? 'pessoa' : 'pessoas' }}</p>
          </div>
        </div>

        <p v-if="forum.messagesCount >= 1" class="mt-4 mb-6 line-clamp-3 text-xs text-text-color-54">
          {{ forum.description || 'Sem descricao cadastrada.' }}
        </p>

        <div class="flex flex-items justify-between">
          <div :class="['text-xs text-text-color-54', forum.messagesCount >= 1 ? 'flex items-center' : '']">
            <p class="mr-1">Criado por:</p>
            <p class="font-bold">{{ forum.creatorName }}</p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-white">
            <span class="rounded-full bg-primary-dark-color p-2">+{{ forum.messagesCount }}</span>
          </div>
        </div>
      </article>
    </div>

    <p v-else class="text-text-color-54">Nenhum forum encontrado.</p>

    <div v-if="totalPages > 1" class="mt-6 flex items-center justify-center gap-1">
      <Button
        class="h-8 w-8 cursor-pointer bg-transparent p-0 text-text-color-54 shadow-none hover:bg-background-color disabled:opacity-40"
        type="button"
        :disabled="currentPage === 1 || isLoadingForums"
        @click="goToPage(currentPage - 1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </Button>

      <Button
        v-for="page in totalPages"
        :key="page"
        :class="[
          'h-8 w-8 cursor-pointer p-0 text-sm shadow-none',
          page === currentPage
            ? 'bg-primary-dark-color rounded-full text-white hover:bg-primary-default-color'
            : 'bg-transparent rounded-full text-text-color-54 hover:bg-background-color',
        ]"
        type="button"
        :disabled="isLoadingForums"
        @click="goToPage(page)"
      >
        {{ page }}
      </Button>

      <Button
        class="h-8 w-8 cursor-pointer bg-transparent p-0 text-text-color-54 shadow-none hover:bg-background-color disabled:opacity-40"
        type="button"
        :disabled="currentPage === totalPages || isLoadingForums"
        @click="goToPage(currentPage + 1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </Button>
    </div>
  </div>

  <CreateForum
    v-model:open="isCreateModalOpen"
    :error-message="createForumErrorMessage"
    :is-submitting="isCreatingForum"
    @submit="createForum"
  />
</template>
