<script setup lang="ts">
import { Mic } from '@lucide/vue'
import { fmtDuration } from '@/lib/format'

defineProps<{ isUser: boolean; seconds: number }>()

const BARS = [6, 11, 5, 15, 9, 17, 6, 13, 19, 8, 5, 15, 10, 6, 17, 9, 4, 12, 8, 16, 6, 10, 4, 8]
</script>

<template>
  <div class="flex min-w-[190px] items-center gap-2 py-[3px]">
    <div
      class="flex h-7 w-7 items-center justify-center rounded-full"
      :class="isUser ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary'"
    >
      <Mic :size="15" />
    </div>
    <div class="flex h-5 flex-1 items-center gap-[2.5px]">
      <span
        v-for="(h, i) in BARS"
        :key="i"
        class="w-[2.5px] rounded-[2px]"
        :class="isUser ? 'bg-white/85' : 'bg-primary'"
        :style="{ height: `${h}px` }"
      ></span>
    </div>
    <span class="text-xs font-semibold" :class="isUser ? 'text-white/90' : 'text-ink-3'">{{ fmtDuration(seconds) }}</span>
  </div>
</template>
