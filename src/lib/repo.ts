import { supabase, currentUserId } from '@/lib/supabase'
import { ChartData, Expense, ParsedExpense } from '@/types'

// ---- Datas -------------------------------------------------------------

export const todayISO = () => new Date().toISOString().slice(0, 10)

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

// ---- Escrita -----------------------------------------------------------

/**
 * Registra um gasto. Se `installments > 1`, gera UMA linha por parcela,
 * dividindo o valor e distribuindo nos meses seguintes — igual à tool
 * `change_data` do Ned no n8n. Retorna as linhas criadas.
 */
export async function addExpense(p: ParsedExpense): Promise<Expense[]> {
  const user_id = await currentUserId()
  if (!user_id) throw new Error('Sem usuário autenticado.')

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

  const { data, error } = await supabase.from('expenses').insert(rows).select('*')
  if (error) throw error
  return (data as Expense[]) || []
}

/** Cancela (exclui) o gasto mais recente do usuário. */
export async function cancelLastExpense(): Promise<Expense | null> {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
  const last = (data as Expense[])?.[0]
  if (!last) return null
  const { error } = await supabase.from('expenses').delete().eq('id', last.id)
  if (error) throw error
  return last
}

// ---- Leitura -----------------------------------------------------------

export async function listExpenses(opts: {
  from?: string
  to?: string
  category?: string
} = {}): Promise<Expense[]> {
  let q = supabase.from('expenses').select('*').order('date', { ascending: false })
  if (opts.from) q = q.gte('date', opts.from)
  if (opts.to) q = q.lte('date', opts.to)
  if (opts.category) q = q.eq('category', opts.category)
  const { data } = await q
  return (data as Expense[]) || []
}

export type Summary = {
  total: number
  count: number
  byCategory: ChartData[] // ordenado desc por total
  top: ChartData | null
  from: string
  to: string
}

/** Resumo de gastos num intervalo — igual ao get_expenses/change_period do n8n. */
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
