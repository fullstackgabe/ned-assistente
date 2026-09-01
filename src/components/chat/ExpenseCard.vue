<script setup lang="ts">
import { computed } from 'vue'
import { CreditCard, Calendar } from '@lucide/vue'
import type { ParsedExpense } from '@/types'
import { categoryColor } from '@/types'
import { alpha, brl, cleanDesc, paymentLabel, shortDate } from '@/lib/format'

const props = defineProps<{ expense: ParsedExpense; pending?: boolean }>()
const color = computed(() => categoryColor(props.expense.category))
</script>

<template>
  <div>
    <p v-if="pending" class="mb-3 text-[13.5px] font-bold text-ink">Confirma pra mim? 👇</p>
    <span class="inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold" :style="{ color, background: alpha(color) }">
      {{ expense.category }}
    </span>
    <p class="mt-2 text-[23px] font-black leading-tight text-ink">{{ brl(expense.value) }}</p>
    <p class="mt-2 text-[15.5px] font-semibold text-ink">{{ cleanDesc(expense.description) }}</p>
    <p class="mt-2 flex items-center gap-1.5 text-sm text-ink-3">
      <CreditCard :size="15" class="text-muted" />
      {{ paymentLabel(expense.payment_method, expense.installments) }}
    </p>
    <p class="mt-[5px] flex items-center gap-1.5 text-sm text-ink-3">
      <Calendar :size="15" class="text-muted" />
      {{ shortDate(expense.date) }}
    </p>
    <p v-if="pending" class="mt-3 text-xs text-faint">Se algo estiver errado, é só me dizer que eu mudo 🙂</p>
  </div>
</template>
