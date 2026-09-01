import type { ChartData, Expense, NewExpense, ParsedExpense } from '@/types'
import { addMonthsISO } from '@/lib/dates'
import {
  expensesInsert,
  expensesList,
  expensesLast,
  expensesUpdate,
  expensesDelete,
  expensesDeleteGroup,
  userId,
  type ListOpts,
} from '@/lib/db'
import { DEMO_UID } from '@/lib/config'

export async function addExpense(p: ParsedExpense): Promise<Expense[]> {
  const user_id = (await userId()) || DEMO_UID
  const n = Math.max(1, Math.floor(p.installments || 1))
  const per = Number((p.value / n).toFixed(2))
  const rows: NewExpense[] = Array.from({ length: n }, (_, i) => ({
    user_id,
    description: p.description,
    value: per,
    category: p.category,
    payment_method: p.payment_method,
    installments: n,
    installment_no: i + 1,
    date: addMonthsISO(p.date, i),
  }))
  return expensesInsert(rows)
}

export async function cancelLastExpense(): Promise<Expense | null> {
  const last = await expensesLast()
  if (!last) return null
  await expensesDelete(last.id)
  return last
}

export type ExpensePatch = Partial<Pick<Expense, 'description' | 'value' | 'category' | 'payment_method'>>

export async function updateExpense(id: string, patch: ExpensePatch): Promise<void> {
  return expensesUpdate(id, patch)
}

export async function deleteExpense(id: string): Promise<void> {
  return expensesDelete(id)
}

export async function deleteExpenseSmart(e: Expense): Promise<void> {
  if (e.installments > 1) {
    return expensesDeleteGroup({
      description: e.description,
      installments: e.installments,
      payment_method: e.payment_method,
      category: e.category,
    })
  }
  return expensesDelete(e.id)
}

export async function listExpenses(opts: ListOpts = {}): Promise<Expense[]> {
  return expensesList(opts)
}

export type Summary = {
  total: number
  count: number
  byCategory: ChartData[]
  top: ChartData | null
  from: string
  to: string
}

export async function summarize(from: string, to: string): Promise<Summary> {
  const rows = await listExpenses({ from, to })
  const totals: Record<string, number> = {}
  let total = 0
  for (const r of rows) {
    total += Number(r.value)
    totals[r.category] = (totals[r.category] || 0) + Number(r.value)
  }
  const byCategory = Object.entries(totals)
    .map(([categoria, t]) => ({ categoria, total: Number(t.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)
  return {
    total: Number(total.toFixed(2)),
    count: rows.length,
    byCategory,
    top: byCategory[0] || null,
    from,
    to,
  }
}
