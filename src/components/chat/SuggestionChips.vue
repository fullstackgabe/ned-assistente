<script setup lang="ts">
import { SUGGESTIONS } from '@/stores/chat'

const emit = defineEmits<{ pick: [text: string] }>()
</script>

<template>
  <div class="flex flex-wrap justify-between gap-y-2 px-3 pb-1.5">
    <button
      v-for="s in SUGGESTIONS"
      :key="s"
      type="button"
      class="w-[48.5%] truncate rounded-full border border-primary-border bg-primary-soft py-[9px] text-center text-[12.5px] font-semibold text-primary"
      @click="emit('pick', s)"
    >
      {{ s }}
    </button>
  </div>
</template>
