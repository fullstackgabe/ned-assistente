import { ChartData, Expense, ParsedExpense } from '@/types'
import { expensesInsert, expensesList, expensesLast, expensesUpdate, expensesDelete, expensesDeleteGroup, userId } from '@/lib/db'

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function shiftDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCMonth(base.getUTCMonth() + months)
  return base.toISOString().slice(0, 10)
}

export function monthRange(ref = todayISO()): { from: string; to: string } {
  const [y, m] = ref.split('-').map(Number)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

export function weekRange(ref = todayISO()): { from: string; to: string } {
  const [y, m, d] = ref.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const diffToMon = (dt.getUTCDay() + 6) % 7 // 0 = segunda ... 6 = domingo
  const mon = new Date(dt)
  mon.setUTCDate(dt.getUTCDate() - diffToMon)
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
}

export async function addExpense(p: ParsedExpense): Promise<Expense[]> {
  const user_id = (await userId()) || 'demo-user-local'

  const n = Math.max(1, Math.floor(p.installments || 1))
  const per = Number((p.value / n).toFixed(2))

  const rows = Array.from({ length: n }, (_, i) => ({
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

export async function updateExpense(
  id: string,
  patch: Partial<Omit<Expense, 'id' | 'user_id' | 'created_at'>>,
): Promise<void> {
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

export async function listExpenses(opts: {
  from?: string
  to?: string
  category?: string
} = {}): Promise<Expense[]> {
  return expensesList(opts)
}

export type Summary = {
  total: number
  count: number
  byCategory: ChartData[] // ordenado desc por total
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
