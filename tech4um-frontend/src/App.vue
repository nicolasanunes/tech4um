<script setup lang="ts">
import NavbarMenu from './components/NavbarMenu.vue';
</script>

<template>
  <div class="flex flex-col h-screen">
      <header>
        <NavbarMenu />
      </header>
      <main class="flex-1 px-4 py-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64 bg-background-color">
        <RouterView v-slot="{ Component, route }">
          <transition name="page" mode="out-in" appear>
            <div :key="route.fullPath">
              <component :is="Component" />
            </div>
          </transition>
        </RouterView>
      </main>
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(80px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-80px);
}
</style>
