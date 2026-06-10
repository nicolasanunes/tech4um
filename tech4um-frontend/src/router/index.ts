import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/forums',
      name: 'forums',
      component: () => import('@/views/ForumsView.vue'),
    },
    {
      path: '/',
      redirect: '/forums',
    },
    {
      path: '/forums/:id',
      name: 'forum',
      component: () => import('@/views/ForumView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const authStore = useAuthStore()
  await authStore.ensureSessionRestored()

  if (!authStore.isAuthenticated) {
    return { name: 'forums' }
  }

  return true
})

export default router
