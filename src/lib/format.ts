import type { PaymentMethod } from '@/types'

export const brl = (value: number) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`

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

export const cleanDesc = (d: string) => (d || '').replace(/\s*\b\d*\s*x\b\s*$/i, '').trim() || (d || '')

export const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export const timeOf = (m: { id: string; created_at?: string }): string => {
  let d: Date | null = null
  if (m.created_at) d = new Date(m.created_at)
  else if (/^\d{10,}/.test(m.id)) d = new Date(Number(m.id.split('-')[0]))
  if (!d || isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const uid = () => `${Date.now()}-${Math.round(Math.random() * 1e9)}`

export const alpha = (hex: string) => `${hex}22`
