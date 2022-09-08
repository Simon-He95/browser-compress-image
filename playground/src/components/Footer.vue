<script setup lang="ts">
import { isDark, toggleDark } from '~/composables'
</script>

<template>
  <nav text-xl mt-6 inline-flex gap-2 justify-center w-full>
    <button class="icon-btn !outline-none" @click="toggleDark()">
      <div v-if="isDark" i-carbon-moon />
      <div v-else i-carbon-sun />
    </button>

    <a
      class="icon-btn"
      i-carbon-logo-github
      rel="noreferrer"
      href="https://github.com/Simon-He95/browser-compress-image"
      target="_blank"
      title="GitHub"
    />
  </nav>
</template>
