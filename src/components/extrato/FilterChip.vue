<script setup lang="ts">
import { computed } from 'vue'
import { alpha } from '@/lib/format'

const props = defineProps<{ label: string; color?: string; active: boolean }>()
const emit = defineEmits<{ select: [] }>()

const c = computed(() => props.color ?? '#4f46e5')
const style = computed(() => (props.active ? { color: c.value, borderColor: c.value, background: alpha(c.value) } : {}))
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold"
    :class="active ? '' : 'border-line bg-chip text-ink-3'"
    :style="style"
    :aria-pressed="active"
    @click="emit('select')"
  >
    <span v-if="color" class="h-2 w-2 rounded-full" :style="{ background: c }"></span>
    {{ label }}
  </button>
</template>
