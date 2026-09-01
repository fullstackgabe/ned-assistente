<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from '@lucide/vue'
import type { Expense, PaymentMethod } from '@/types'
import { CATEGORIES, PAYMENT_METHODS, categoryColor } from '@/types'
import { alpha } from '@/lib/format'
import { updateExpense } from '@/lib/repo'
import ModalSheet from '@/components/ModalSheet.vue'

const props = defineProps<{ expense: Expense }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const desc = ref(props.expense.description)
const valueStr = ref(String(props.expense.value).replace('.', ','))
const category = ref(props.expense.category)
const method = ref<PaymentMethod>(props.expense.payment_method)
const busy = ref(false)

const parcelado = computed(() => props.expense.installments > 1)
const value = computed(() => parseFloat(valueStr.value.replace(/\./g, '').replace(',', '.')))
const valid = computed(() => desc.value.trim().length > 0 && !isNaN(value.value) && value.value > 0)

async function save() {
  if (!valid.value || busy.value) return
  busy.value = true
  try {
    await updateExpense(props.expense.id, {
      description: desc.value.trim(),
      value: Number(value.value.toFixed(2)),
      category: category.value,
      payment_method: method.value,
    })
    emit('saved')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalSheet @close="emit('close')">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-extrabold text-ink">Editar gasto</h2>
      <button type="button" class="p-1 text-faint" aria-label="Fechar" @click="emit('close')">
        <X :size="24" />
      </button>
    </div>

    <label class="label" for="edit-desc">Descrição</label>
    <input id="edit-desc" v-model="desc" class="field" placeholder="Ex.: iFood" />

    <label class="label" for="edit-value">Valor (R$)</label>
    <input id="edit-value" v-model="valueStr" class="field" inputmode="decimal" placeholder="Ex.: 45,00" />

    <p class="label">Categoria</p>
    <div class="flex flex-wrap gap-[7px]">
      <button
        v-for="cat in CATEGORIES"
        :key="cat"
        type="button"
        class="flex items-center gap-1.5 rounded-full border px-[11px] py-1.5 text-[12.5px] font-bold"
        :class="cat === category ? '' : 'border-line bg-chip text-ink-3'"
        :style="cat === category ? { color: categoryColor(cat), borderColor: categoryColor(cat), background: alpha(categoryColor(cat)) } : {}"
        @click="category = cat"
      >
        <span class="h-2 w-2 rounded-full" :style="{ background: categoryColor(cat) }"></span>
        {{ cat }}
      </button>
    </div>

    <p class="label">Método</p>
    <div class="flex flex-wrap gap-[7px]">
      <button
        v-for="m in PAYMENT_METHODS"
        :key="m"
        type="button"
        class="rounded-full border px-[13px] py-[7px] text-[12.5px] font-bold"
        :class="m === method ? 'border-primary bg-primary text-white' : 'border-line bg-chip text-ink-3'"
        @click="method = m"
      >
        {{ m }}
      </button>
    </div>

    <p v-if="parcelado" class="mt-3 text-xs leading-[17px] text-faint">
      Editando a parcela {{ expense.installment_no }}/{{ expense.installments }} — as outras não mudam.
    </p>

    <div class="mt-[18px] flex gap-2.5">
      <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="!valid || busy" :class="!valid || busy ? 'opacity-50' : ''" @click="save">
        Salvar
      </button>
    </div>
  </ModalSheet>
</template>
