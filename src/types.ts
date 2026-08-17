
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
  date: string
  created_at?: string
}

export type ParsedExpense = {
  value: number
  description: string
  payment_method: PaymentMethod
  category: string
  installments: number
  date: string
}

export type ChartData = { categoria: string; total: number }

export type MessageMeta =
  | { type: 'chart'; title?: string; data: ChartData[]; total?: number }
  | { type: 'expense'; expense: ParsedExpense; count: number }
  | { type: 'pending'; expense: ParsedExpense }
  | null

export type ChatMessage = {
  id: string
  user_id?: string
  role: 'user' | 'assistant'
  content: string
  meta?: MessageMeta
  created_at?: string
}

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

export const brl = (value: number) =>
  `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`

export const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export const paymentLabel = (method: PaymentMethod, installments: number) => {
  if (method !== 'crédito') return method
  return installments > 1 ? `crédito parcelado em ${installments}x` : 'crédito à vista'
}

export const paymentLabelRow = (method: PaymentMethod, installmentNo: number, installments: number) => {
  if (method !== 'crédito') return method
  return installments > 1 ? `crédito ${installmentNo}/${installments}` : 'crédito à vista'
}
