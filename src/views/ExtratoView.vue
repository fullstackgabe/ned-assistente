<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Trophy, RefreshCw } from '@lucide/vue'
import type { Expense } from '@/types'
import { categoryColor } from '@/types'
import { brl } from '@/lib/format'
import { useExpensesStore } from '@/stores/expenses'
import PeriodDropdown from '@/components/extrato/PeriodDropdown.vue'
import CategoryChart from '@/components/extrato/CategoryChart.vue'
import FilterChip from '@/components/extrato/FilterChip.vue'
import ExpenseRow from '@/components/extrato/ExpenseRow.vue'
import EditSheet from '@/components/extrato/EditSheet.vue'
import DeleteSheet from '@/components/extrato/DeleteSheet.vue'

const store = useExpensesStore()
const editing = ref<Expense | null>(null)
const deleting = ref<Expense | null>(null)

onMounted(() => store.load())

async function afterEdit() {
  editing.value = null
  await store.load()
}

async function afterDelete() {
  deleting.value = null
  await store.load()
}
</script>

<template>
  <div class="no-scrollbar flex flex-col overflow-y-auto bg-page p-4 pb-8">
    <div class="mb-1.5 mt-0.5 flex items-center justify-between">
      <p class="text-[16px] font-bold text-muted">Período</p>
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full text-muted active:bg-chip"
        aria-label="Atualizar"
        :disabled="store.loading"
        @click="store.load()"
      >
        <RefreshCw :size="22" :class="store.loading ? 'animate-spin' : ''" />
      </button>
    </div>

    <PeriodDropdown :model-value="store.period" @update:model-value="store.setPeriod" />

    <div class="rounded-[18px] border border-line bg-white p-4">
      <p class="text-[13px] text-muted">Total no período</p>
      <p class="mt-0.5 text-[30px] font-black leading-tight text-ink">{{ brl(store.summary?.total || 0) }}</p>
      <p v-if="store.summary?.top" class="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
        <Trophy :size="15" class="text-[#f59e0b]" />
        <span>Categoria vencedora: <b class="font-bold text-ink">{{ store.summary.top.categoria }}</b></span>
      </p>
      <CategoryChart
        v-if="store.summary && store.summary.byCategory.length > 0"
        :data="store.summary.byCategory"
        :total="store.summary.total"
      />
    </div>

    <div v-if="store.summary && store.summary.byCategory.length > 0" class="mt-3.5 flex flex-wrap gap-2">
      <FilterChip label="Todas" :active="store.category === null" @select="store.setCategory(null)" />
      <FilterChip
        v-for="c in store.summary.byCategory"
        :key="c.categoria"
        :label="c.categoria"
        :color="categoryColor(c.categoria)"
        :active="store.category === c.categoria"
        @select="store.setCategory(c.categoria)"
      />
    </div>

    <div class="mb-1 ml-1 mt-[18px] flex items-baseline gap-2">
      <p class="font-extrabold text-ink">Lançamentos</p>
      <span v-if="store.rows.length > 0" class="text-[13px] font-bold text-ink">{{ store.rows.length }}</span>
    </div>

    <ExpenseRow v-for="e in store.rows" :key="e.id" :e="e" @edit="editing = e" @delete="deleting = e" />

    <p v-if="store.loaded && store.rows.length === 0" class="mt-6 text-center text-faint">Nenhum gasto para esse período.</p>

    <EditSheet v-if="editing" :expense="editing" @close="editing = null" @saved="afterEdit" />
    <DeleteSheet v-if="deleting" :expense="deleting" @close="deleting = null" @deleted="afterDelete" />
  </div>
</template>
