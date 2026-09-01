<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { LogOut } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const title = computed(() => String(route.meta.title ?? 'Ned'))
</script>

<template>
  <header class="shrink-0 bg-primary pt-[env(safe-area-inset-top)] text-white">
    <div class="relative flex h-14 items-center justify-center">
      <h1 class="text-[17px] font-extrabold">{{ title }}</h1>
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 active:bg-white/15"
        aria-label="Sair"
        @click="auth.signOut()"
      >
        <LogOut :size="24" />
      </button>
    </div>
  </header>
</template>
