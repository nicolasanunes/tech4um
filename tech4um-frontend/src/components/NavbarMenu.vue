<script setup lang="ts">
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserInitials } from '@/utils/user-initials'
import AuthComponent from './AuthComponent.vue'
import UpdateAvatar from './UpdateAvatar.vue'

const authStore = useAuthStore()
const router = useRouter()
const isUserMenuOpen = ref(false)
const isLoggingOut = ref(false)
const userMenuContainerRef = ref<HTMLElement | null>(null)

const userInitials = computed(() => getUserInitials(authStore.user?.username))

function toggleUserMenu(): void {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

function handleUserMenuKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleUserMenu()
  }
}

function handleDocumentClick(event: MouseEvent): void {
  if (!isUserMenuOpen.value) {
    return
  }

  const container = userMenuContainerRef.value
  if (!container) {
    return
  }

  const target = event.target
  if (!(target instanceof Node)) {
    return
  }

  if (!container.contains(target)) {
    isUserMenuOpen.value = false
  }
}

async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) {
    return
  }

  isLoggingOut.value = true

  try {
    await authStore.logout()
    isUserMenuOpen.value = false
    await router.replace('/forums')
  } finally {
    isLoggingOut.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div
    class="flex justify-between bg-background-color items-center px-4 py-4 border-b-2 border-text-color-25/20 md:px-8 lg:px-16 xl:px-32 2xl:px-64"
  >
  <div class="flex items-center gap-4">
    <RouterLink to="/forums" class="font-bold text-xl">
      <svg width="61.6" height="32.4" viewBox="0 0 154 81" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.1193 1.86783V4.51012H12.1931V33.712H8.97227V4.51012H0V1.86783H21.1193Z" fill="white"/>
        <path d="M21.1193 1.86783V4.51012H12.1931V33.712H8.97227V4.51012H0V1.86783H21.1193Z" fill="black" fill-opacity="0.54"/>
        <path d="M48.9348 19.9994C48.9348 21.0928 48.9041 21.928 48.8428 22.5051H27.9995C28.0915 24.3881 28.5516 25.9978 29.3799 27.3341C30.2081 28.6704 31.297 29.6879 32.6467 30.3864C33.9964 31.0546 35.4687 31.3886 37.0638 31.3886C39.1497 31.3886 40.8981 30.8875 42.3091 29.8853C43.7508 28.883 44.7017 27.5315 45.1618 25.8307H48.5667C47.9532 28.2604 46.6342 30.2497 44.6097 31.7987C42.6159 33.3172 40.1006 34.0765 37.0638 34.0765C34.7019 34.0765 32.5853 33.5602 30.7142 32.5276C28.8431 31.4646 27.3707 29.9764 26.2971 28.063C25.2541 26.1192 24.7327 23.8566 24.7327 21.275C24.7327 18.6935 25.2541 16.4308 26.2971 14.4871C27.34 12.5433 28.797 11.0551 30.6682 10.0225C32.5393 8.98987 34.6712 8.47357 37.0638 8.47357C39.4564 8.47357 41.5423 8.98987 43.3214 10.0225C45.1312 11.0551 46.5115 12.4522 47.4624 14.2137C48.444 15.9449 48.9348 17.8735 48.9348 19.9994ZM45.668 19.9083C45.6986 18.0557 45.3152 16.4764 44.5177 15.1704C43.7508 13.8645 42.6926 12.8774 41.3429 12.2092C39.9932 11.5411 38.5208 11.207 36.9258 11.207C34.5332 11.207 32.4933 11.9663 30.8062 13.4848C29.1191 15.0034 28.1836 17.1445 27.9995 19.9083H45.668Z" fill="white"/>
        <path d="M48.9348 19.9994C48.9348 21.0928 48.9041 21.928 48.8428 22.5051H27.9995C28.0915 24.3881 28.5516 25.9978 29.3799 27.3341C30.2081 28.6704 31.297 29.6879 32.6467 30.3864C33.9964 31.0546 35.4687 31.3886 37.0638 31.3886C39.1497 31.3886 40.8981 30.8875 42.3091 29.8853C43.7508 28.883 44.7017 27.5315 45.1618 25.8307H48.5667C47.9532 28.2604 46.6342 30.2497 44.6097 31.7987C42.6159 33.3172 40.1006 34.0765 37.0638 34.0765C34.7019 34.0765 32.5853 33.5602 30.7142 32.5276C28.8431 31.4646 27.3707 29.9764 26.2971 28.063C25.2541 26.1192 24.7327 23.8566 24.7327 21.275C24.7327 18.6935 25.2541 16.4308 26.2971 14.4871C27.34 12.5433 28.797 11.0551 30.6682 10.0225C32.5393 8.98987 34.6712 8.47357 37.0638 8.47357C39.4564 8.47357 41.5423 8.98987 43.3214 10.0225C45.1312 11.0551 46.5115 12.4522 47.4624 14.2137C48.444 15.9449 48.9348 17.8735 48.9348 19.9994ZM45.668 19.9083C45.6986 18.0557 45.3152 16.4764 44.5177 15.1704C43.7508 13.8645 42.6926 12.8774 41.3429 12.2092C39.9932 11.5411 38.5208 11.207 36.9258 11.207C34.5332 11.207 32.4933 11.9663 30.8062 13.4848C29.1191 15.0034 28.1836 17.1445 27.9995 19.9083H45.668Z" fill="black" fill-opacity="0.54"/>
        <path d="M53.3551 21.275C53.3551 18.6935 53.8766 16.446 54.9195 14.5326C55.9625 12.5889 57.4042 11.1007 59.2446 10.0681C61.0851 9.00506 63.1863 8.47357 65.5482 8.47357C68.6463 8.47357 71.1923 9.23285 73.1862 10.7514C75.2107 12.27 76.5143 14.3352 77.0971 16.9471H73.6463C73.2168 15.1552 72.2813 13.7582 70.8396 12.7559C69.4285 11.7233 67.6648 11.207 65.5482 11.207C63.8611 11.207 62.3428 11.5866 60.9931 12.3459C59.6434 13.1052 58.5698 14.2441 57.7723 15.7627C57.0054 17.2508 56.622 19.0883 56.622 21.275C56.622 23.4618 57.0054 25.3144 57.7723 26.833C58.5698 28.3515 59.6434 29.4904 60.9931 30.2497C62.3428 31.009 63.8611 31.3886 65.5482 31.3886C67.6648 31.3886 69.4285 30.8875 70.8396 29.8853C72.2813 28.8526 73.2168 27.4252 73.6463 25.6029H77.0971C76.5143 28.1541 75.2107 30.2042 73.1862 31.7531C71.1616 33.302 68.6157 34.0765 65.5482 34.0765C63.1863 34.0765 61.0851 33.5602 59.2446 32.5276C57.4042 31.4646 55.9625 29.9764 54.9195 28.063C53.8766 26.1192 53.3551 23.8566 53.3551 21.275Z" fill="white"/>
        <path d="M53.3551 21.275C53.3551 18.6935 53.8766 16.446 54.9195 14.5326C55.9625 12.5889 57.4042 11.1007 59.2446 10.0681C61.0851 9.00506 63.1863 8.47357 65.5482 8.47357C68.6463 8.47357 71.1923 9.23285 73.1862 10.7514C75.2107 12.27 76.5143 14.3352 77.0971 16.9471H73.6463C73.2168 15.1552 72.2813 13.7582 70.8396 12.7559C69.4285 11.7233 67.6648 11.207 65.5482 11.207C63.8611 11.207 62.3428 11.5866 60.9931 12.3459C59.6434 13.1052 58.5698 14.2441 57.7723 15.7627C57.0054 17.2508 56.622 19.0883 56.622 21.275C56.622 23.4618 57.0054 25.3144 57.7723 26.833C58.5698 28.3515 59.6434 29.4904 60.9931 30.2497C62.3428 31.009 63.8611 31.3886 65.5482 31.3886C67.6648 31.3886 69.4285 30.8875 70.8396 29.8853C72.2813 28.8526 73.2168 27.4252 73.6463 25.6029H77.0971C76.5143 28.1541 75.2107 30.2042 73.1862 31.7531C71.1616 33.302 68.6157 34.0765 65.5482 34.0765C63.1863 34.0765 61.0851 33.5602 59.2446 32.5276C57.4042 31.4646 55.9625 29.9764 54.9195 28.063C53.8766 26.1192 53.3551 23.8566 53.3551 21.275Z" fill="black" fill-opacity="0.54"/>
        <path d="M95.0086 8.38245C96.9104 8.38245 98.6128 8.77728 100.116 9.56693C101.65 10.3566 102.846 11.5714 103.705 13.2115C104.594 14.8211 105.039 16.7953 105.039 19.1339V33.712H101.864V19.4983C101.864 16.7953 101.174 14.73 99.7938 13.3026C98.4441 11.8751 96.5883 11.1614 94.2264 11.1614C91.8031 11.1614 89.8706 11.9207 88.4289 13.4393C86.9872 14.9578 86.2664 17.1901 86.2664 20.1361V33.712H83.0456V0H86.2664V13.0748C87.0639 11.5866 88.2296 10.4325 89.7633 9.61248C91.3277 8.79246 93.0761 8.38245 95.0086 8.38245Z" fill="white"/>
        <path d="M95.0086 8.38245C96.9104 8.38245 98.6128 8.77728 100.116 9.56693C101.65 10.3566 102.846 11.5714 103.705 13.2115C104.594 14.8211 105.039 16.7953 105.039 19.1339V33.712H101.864V19.4983C101.864 16.7953 101.174 14.73 99.7938 13.3026C98.4441 11.8751 96.5883 11.1614 94.2264 11.1614C91.8031 11.1614 89.8706 11.9207 88.4289 13.4393C86.9872 14.9578 86.2664 17.1901 86.2664 20.1361V33.712H83.0456V0H86.2664V13.0748C87.0639 11.5866 88.2296 10.4325 89.7633 9.61248C91.3277 8.79246 93.0761 8.38245 95.0086 8.38245Z" fill="black" fill-opacity="0.54"/>
        <path d="M0 72.3214V61.2511L21.1884 31.3203H36.0271V60.7044H41.3414V72.3214H36.0271V80.5217H22.3616V72.3214H0ZM23.3969 46.4224L13.8725 60.7044H23.3969V46.4224Z" fill="#1772B3"/>
        <path d="M61.3155 32.3453V60.2944C61.3155 62.8912 61.9137 64.8957 63.11 66.3079C64.3523 67.7202 66.2158 68.4263 68.7004 68.4263C71.185 68.4263 73.0485 67.7202 74.2908 66.3079C75.5791 64.8501 76.2233 62.8456 76.2233 60.2944V32.3453H89.7507V60.2944C89.7507 64.7134 88.8075 68.4947 86.921 71.6381C85.0345 74.7359 82.4579 77.0821 79.191 78.6766C75.9702 80.2255 72.3813 81 68.4243 81C64.4673 81 60.9244 80.2255 57.7956 78.6766C54.7128 77.0821 52.2742 74.7359 50.4798 71.6381C48.7313 68.5402 47.8571 64.759 47.8571 60.2944V32.3453H61.3155Z" fill="#1772B3"/>
        <path d="M154 32.3453V80.5217H140.473V53.9393L131.293 80.5217H119.974L110.726 53.7342V80.5217H97.1986V32.3453H113.556L125.772 63.6429L137.712 32.3453H154Z" fill="#1772B3"/>
      </svg>
    </RouterLink>
    <p class="hidden sm:flex text-xs text-text-color-25 sm:text-base">Seu fórum sobre tecnologia!</p>
    </div>
    <div ref="userMenuContainerRef" v-if="authStore.isAuthenticated" class="relative flex items-center gap-4">
      <div class="text-text-color-54">
        <p class="text-sm font-bold">{{ authStore.user?.username }}</p>
        <p class="text-xs">{{ authStore.user?.email }}</p>
      </div>
      <Avatar
        class="size-10 cursor-pointer"
        role="button"
        aria-label="Abrir menu do usuario"
        :aria-expanded="isUserMenuOpen"
        tabindex="0"
        @click="toggleUserMenu"
        @keydown="handleUserMenuKeydown"
      >
        <AvatarImage :src="authStore.user?.avatarUrl ?? ''" alt="profile-picture" />
        <AvatarFallback class="border border-text-color-25/30">{{ userInitials }}</AvatarFallback>
      </Avatar>

      <div
        v-if="isUserMenuOpen"
        class="absolute right-0 top-[3.75rem] z-10 min-w-42 rounded-md border border-text-color-25/20 bg-white p-2 shadow-lg"
      >
        <UpdateAvatar />

        <button
          class="w-full rounded px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          type="button"
          :disabled="isLoggingOut"
          @click="handleLogout"
        >
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out-icon lucide-log-out"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
            {{ isLoggingOut ? 'Saindo...' : 'Logout' }}
          </div>
        </button>
      </div>
    </div>
    <div v-else>
      <AuthComponent />
    </div>

  </div>
</template>
