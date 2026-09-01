<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { to: '/chat', label: 'Chat', emoji: '💬' },
  { to: '/extrato', label: 'Extrato', emoji: '📊' },
]

const isActive = (to: string) => route.path.startsWith(to)
</script>

<template>
  <nav class="shrink-0 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
    <div class="flex h-[54px]">
      <button
        v-for="t in tabs"
        :key="t.to"
        type="button"
        class="flex flex-1 flex-col items-center justify-center gap-0.5"
        :aria-current="isActive(t.to) ? 'page' : undefined"
        @click="router.push(t.to)"
      >
        <span class="text-[20px] leading-none" :class="isActive(t.to) ? 'opacity-100' : 'opacity-55'">{{ t.emoji }}</span>
        <span class="text-[10.5px] font-semibold" :class="isActive(t.to) ? 'text-primary' : 'text-faint'">{{ t.label }}</span>
      </button>
    </div>
  </nav>
</template>
