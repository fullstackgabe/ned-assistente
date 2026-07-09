// ---- Domínio: gastos ----------------------------------------------------

export type PaymentMethod = 'crédito' | 'débito' | 'pix' | 'dinheiro'

export const PAYMENT_METHODS: PaymentMethod[] = ['crédito', 'débito', 'pix', 'dinheiro']

export type Expense = {
  id: string
  user_id?: string
  description: string
  value: number
  category: string
  payment_method: PaymentMethod
  installments: number
  installment_no: number
  date: string // YYYY-MM-DD
  created_at?: string
}

// Campos extraídos de uma frase antes de virar linha(s) em `expenses`.
export type ParsedExpense = {
  value: number
  description: string
  payment_method: PaymentMethod
  category: string
  installments: number
  date: string // YYYY-MM-DD
}

// ---- Domínio: chat ------------------------------------------------------

export type ChartData = { categoria: string; total: number }

export type MessageMeta =
  | { type: 'chart'; title?: string; data: ChartData[]; total?: number }
  | { type: 'expense'; expense: ParsedExpense; count: number }
  | null

export type ChatMessage = {
  id: string
  user_id?: string
  role: 'user' | 'assistant'
  content: string
  meta?: MessageMeta
  created_at?: string
}

// ---- Categorias & paleta ------------------------------------------------

export const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: '#f97316',
  Transporte: '#0ea5e9',
  Saúde: '#ef4444',
  Roupas: '#a855f7',
  Lazer: '#ec4899',
  Casa: '#14b8a6',
  Educação: '#6366f1',
  Contas: '#eab308',
  Mercado: '#22c55e',
  Outros: '#94a3b8',
}

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Outros
}

// ---- Formatação --------------------------------------------------------

export const brl = (value: number) =>
  `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`

export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}
