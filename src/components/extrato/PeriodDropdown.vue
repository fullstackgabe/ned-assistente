<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronUp, Check } from '@lucide/vue'
import { PERIODS, type PeriodKey } from '@/stores/expenses'

const props = defineProps<{ modelValue: PeriodKey }>()
const emit = defineEmits<{ 'update:modelValue': [key: PeriodKey] }>()

const open = ref(false)
const label = computed(() => PERIODS.find((p) => p.key === props.modelValue)?.label ?? '')

function choose(key: PeriodKey) {
  emit('update:modelValue', key)
  open.value = false
}
</script>

<template>
  <div class="relative z-20 mb-3.5">
    <button
      type="button"
      class="relative z-[2] flex w-full items-center justify-between rounded-xl border bg-white px-3.5 py-3"
      :class="open ? 'border-primary' : 'border-line'"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="flex items-center gap-[9px]">
        <span class="text-[17px] leading-none">🗓️</span>
        <span class="text-sm font-bold text-ink">{{ label }}</span>
      </span>
      <ChevronUp v-if="open" :size="18" class="text-primary" />
      <ChevronDown v-else :size="18" class="text-primary" />
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-[1]" @click="open = false"></div>
      <div
        class="absolute left-0 right-0 top-[52px] z-[3] overflow-hidden rounded-xl border border-line bg-white shadow-[0_6px_12px_rgba(15,23,42,0.12)]"
      >
        <button
          v-for="(p, i) in PERIODS"
          :key="p.key"
          type="button"
          class="flex w-full items-center justify-between px-3.5 py-[11px] text-sm"
          :class="[
            p.key === modelValue ? 'bg-primary-soft font-bold text-primary' : 'bg-white font-semibold text-ink-2',
            i === 0 ? '' : 'border-t border-line-soft',
          ]"
          @click="choose(p.key)"
        >
          {{ p.label }}
          <Check v-if="p.key === modelValue" :size="17" class="text-primary" />
        </button>
      </div>
    </template>
  </div>
</template>
