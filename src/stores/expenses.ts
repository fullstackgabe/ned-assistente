import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Expense } from '@/types'
import { listExpenses, summarize, type Summary } from '@/lib/repo'
import { todayISO, shiftDaysISO, addMonthsISO, monthRange, weekRange } from '@/lib/dates'

export type PeriodKey = 'hoje' | 'ontem' | 'semana' | 'semana_passada' | 'mes' | 'passado'

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'semana_passada', label: 'Semana passada' },
  { key: 'mes', label: 'Este mês' },
  { key: 'passado', label: 'Mês passado' },
]

export function rangeFor(key: PeriodKey): { from: string; to: string } {
  const today = todayISO()
  if (key === 'hoje') return { from: today, to: today }
  if (key === 'ontem') {
    const y = shiftDaysISO(today, -1)
    return { from: y, to: y }
  }
  if (key === 'semana') return weekRange(today)
  if (key === 'semana_passada') return weekRange(shiftDaysISO(today, -7))
  if (key === 'passado') return monthRange(addMonthsISO(today, -1))
  return monthRange(today)
}

export const useExpensesStore = defineStore('expenses', () => {
  const period = ref<PeriodKey>('mes')
  const category = ref<string | null>(null)
  const rows = ref<Expense[]>([])
  const summary = ref<Summary | null>(null)
  const loading = ref(false)
  const loaded = ref(false)

  async function load() {
    loading.value = true
    try {
      const { from, to } = rangeFor(period.value)
      const [s, list] = await Promise.all([
        summarize(from, to),
        listExpenses({ from, to, category: category.value ?? undefined }),
      ])
      summary.value = s
      rows.value = list
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  function setPeriod(key: PeriodKey) {
    period.value = key
    category.value = null
    return load()
  }

  function setCategory(c: string | null) {
    category.value = c
    return load()
  }

  function reset() {
    period.value = 'mes'
    category.value = null
    rows.value = []
    summary.value = null
    loaded.value = false
  }

  return { period, category, rows, summary, loading, loaded, load, setPeriod, setCategory, reset }
})
