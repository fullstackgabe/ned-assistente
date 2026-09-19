<script setup lang="ts">
import { computed } from 'vue'
import { Pencil, Trash2 } from '@lucide/vue'
import type { Expense } from '@/types'
import { categoryColor } from '@/types'
import { alpha, brl, paymentLabelRow, shortDate } from '@/lib/format'

const props = defineProps<{ e: Expense; compact?: boolean }>()
const emit = defineEmits<{ edit: []; delete: [] }>()

const color = computed(() => categoryColor(props.e.category))
</script>

<template>
  <div class="flex items-center rounded-[14px] border border-line p-3" :class="compact ? 'bg-page' : 'mb-2 bg-white'">
    <div class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :style="{ background: alpha(color) }">
      <span class="h-3 w-3 rounded-full" :style="{ background: color }"></span>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-bold text-ink">{{ e.description }}</p>
      <p class="mt-0.5 text-xs text-faint">
        {{ e.category }} · {{ paymentLabelRow(e.payment_method, e.installment_no, e.installments) }} · {{ shortDate(e.date) }}
      </p>
    </div>
    <span class="text-[15px] font-extrabold text-ink" :class="compact ? '' : 'mr-1.5'">{{ brl(e.value) }}</span>
    <template v-if="!compact">
      <button
        v-if="e.installments <= 1"
        type="button"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-chip active:bg-chip"
        aria-label="Editar"
        @click="emit('edit')"
      >
        <Pencil :size="18" />
      </button>
      <button
        type="button"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-danger-light hover:bg-danger-fill hover:text-danger active:bg-danger-fill active:text-danger"
        aria-label="Excluir"
        @click="emit('delete')"
      >
        <Trash2 :size="19" />
      </button>
    </template>
  </div>
</template>
