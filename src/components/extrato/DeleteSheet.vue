<script setup lang="ts">
import { computed, ref } from 'vue'
import { X, TriangleAlert, CircleAlert } from '@lucide/vue'
import type { Expense } from '@/types'
import { deleteExpenseSmart } from '@/lib/repo'
import ModalSheet from '@/components/ModalSheet.vue'
import ExpenseRow from './ExpenseRow.vue'

const props = defineProps<{ expense: Expense }>()
const emit = defineEmits<{ close: []; deleted: [] }>()

const busy = ref(false)
const parcelado = computed(() => props.expense.installments > 1)
const warning = computed(() =>
  parcelado.value
    ? `Esse gasto é parcelado em ${props.expense.installments}x.\nExcluir remove TODAS as ${props.expense.installments} parcelas — as anteriores e as próximas também.\nEssa ação não tem volta.`
    : 'Tem certeza que deseja excluir?\nEssa ação não tem volta.',
)

async function remove() {
  if (busy.value) return
  busy.value = true
  try {
    await deleteExpenseSmart(props.expense)
    emit('deleted')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalSheet @close="emit('close')">
    <div class="mb-3.5 flex items-center justify-between">
      <h2 class="text-lg font-extrabold text-ink">Excluir gasto</h2>
      <button type="button" class="p-1 text-faint" aria-label="Fechar" @click="emit('close')">
        <X :size="24" />
      </button>
    </div>

    <ExpenseRow :e="expense" compact class="mb-3.5" />

    <div
      class="mb-4 flex gap-2.5 rounded-[14px] border p-3.5"
      :class="parcelado ? 'border-warn-border bg-warn-soft' : 'border-danger-border bg-danger-soft'"
    >
      <TriangleAlert v-if="parcelado" :size="20" class="shrink-0 text-warn-icon" />
      <CircleAlert v-else :size="20" class="shrink-0 text-danger" />
      <p class="flex-1 whitespace-pre-line text-[13px] leading-[19px]" :class="parcelado ? 'text-warn-text' : 'text-[#7f1d1d]'">
        {{ warning }}
      </p>
    </div>

    <div class="flex gap-2.5">
      <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-danger" :disabled="busy" :class="busy ? 'opacity-60' : ''" @click="remove">
        {{ parcelado ? 'Excluir tudo' : 'Excluir' }}
      </button>
    </div>
  </ModalSheet>
</template>
