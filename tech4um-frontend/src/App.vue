<script setup lang="ts">
import NavbarMenu from './components/NavbarMenu.vue';
</script>

<template>
  <div class="flex flex-col h-screen">
      <header>
        <NavbarMenu />
      </header>
      <main class="flex-1 px-4 py-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64 bg-background-color">
        <RouterView />
      </main>
  </div>
</template>

<style scoped></style>
