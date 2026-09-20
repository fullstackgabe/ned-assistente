<script setup lang="ts">
import { CheckCheck, Mic } from '@lucide/vue'
import { fmtDuration } from '@/lib/format'

defineProps<{ isUser: boolean; seconds: number; time?: string }>()

const BARS = [6, 11, 5, 15, 9, 17, 6, 13, 19, 8, 5, 15, 10, 6, 17, 9, 4, 12, 8, 16, 6, 10, 4, 8]
</script>

<template>
  <div class="min-w-[190px] py-[3px]">
    <div class="flex items-center gap-2">
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
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
    </div>
    <div class="mt-0.5 flex items-center justify-between pl-9 text-[10.5px]" :class="isUser ? 'text-white/70' : 'text-faint'">
      <span>{{ fmtDuration(seconds) }}</span>
      <div v-if="time" class="flex items-center gap-[3px]">
        <span>{{ time }}</span>
        <CheckCheck v-if="isUser" :size="13" class="text-[#53bdeb]" />
      </div>
    </div>
  </div>
</template>
