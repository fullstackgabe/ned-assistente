// ---------------------------------------------------------------------------
// Cérebro LOCAL do Ned (fallback).
//
// O cérebro "oficial" é a Supabase Edge Function `agent` (OpenAI function
// calling — ver supabase/functions/agent/index.ts). Este módulo é um
// interpretador heurístico em PT-BR usado quando a Edge Function não está
// acessível, para a demo do app funcionar sozinha (registrar, resumir,
// cancelar). Ele espelha o comportamento das tools do Ned no n8n.
// ---------------------------------------------------------------------------

import { ParsedExpense, PaymentMethod, brl } from '@/types'
import {
  addExpense,
  cancelLastExpense,
  monthRange,
  summarize,
  todayISO,
  addMonthsISO,
} from '@/lib/repo'

export type AgentReply = { reply: string; meta?: any }

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    // remove acentos (marcas diacríticas combinantes U+0300–U+036F)
    .replace(/[̀-ͯ]/g, '')

// ---- Parsers -----------------------------------------------------------

function parseValue(text: string): number | null {
  // Captura "R$ 1.200,50", "1200", "50,75", "50.75", "50 reais"
  const m = text.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i)
  if (!m) return null
  let raw = m[1]
  if (raw.includes('.') && raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.')
  else if (raw.includes(',')) raw = raw.replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '')
  const v = parseFloat(raw)
  return isNaN(v) ? null : v
}

function parsePayment(t: string): PaymentMethod {
  if (/\bpix\b/.test(t)) return 'pix'
  if (/debito|debit/.test(t)) return 'débito'
  if (/credito|credit|cartao|cartão/.test(t)) return 'crédito'
  if (/dinheiro|especie|cash|a vista|à vista/.test(t)) return 'dinheiro'
  return 'crédito'
}

function parseInstallments(t: string): number {
  if (/a vista|à vista|avista/.test(t)) return 1
  const x = t.match(/(\d+)\s*x\b/)
  if (x) return parseInt(x[1])
  const v = t.match(/(?:em|de)\s+(\d+)\s*(?:vezes|parcelas|x)/)
  if (v) return parseInt(v[1])
  const p = t.match(/(\d+)\s*parcelas/)
  if (p) return parseInt(p[1])
  return 1
}

function parseDate(t: string): string {
  const today = todayISO()
  if (/anteontem/.test(t)) return shiftDays(today, -2)
  if (/ontem/.test(t)) return shiftDays(today, -1)
  const dm = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (dm) {
    const [, d, m, y] = dm
    const year = y ? (y.length === 2 ? `20${y}` : y) : today.slice(0, 4)
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const dia = t.match(/\bdia\s+(\d{1,2})\b/)
  if (dia) return `${today.slice(0, 7)}-${dia[1].padStart(2, '0')}`
  return today
}

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentação: ['ifood', 'pizza', 'restaurante', 'almoco', 'jantar', 'lanche', 'padaria', 'cafe', 'comida', 'hamburguer', 'sushi', 'bar', 'cerveja'],
  Mercado: ['mercado', 'supermercado', 'feira', 'hortifruti', 'compras do mes'],
  Transporte: ['uber', '99', 'taxi', 'gasolina', 'combustivel', 'onibus', 'metro', 'estacionamento', 'pedagio', 'passagem'],
  Saúde: ['farmacia', 'remedio', 'medico', 'dentista', 'consulta', 'exame', 'academia', 'plano de saude'],
  Roupas: ['tenis', 'roupa', 'camisa', 'calca', 'vestido', 'sapato', 'loja'],
  Lazer: ['cinema', 'netflix', 'spotify', 'show', 'viagem', 'jogo', 'streaming', 'festa'],
  Casa: ['aluguel', 'movel', 'moveis', 'decoracao', 'reforma', 'faxina'],
  Contas: ['luz', 'agua', 'internet', 'telefone', 'celular', 'conta de', 'boleto', 'fatura'],
  Educação: ['curso', 'faculdade', 'livro', 'escola', 'mensalidade'],
}

function parseCategory(t: string): string {
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => t.includes(w))) return cat
  }
  return 'Outros'
}

function parseDescription(original: string, t: string, category: string): string {
  let d = t
    .replace(/(?:r\$\s*)?\d[\d.,]*\s*(?:reais|reai|conto)?/gi, ' ')
    .replace(/\bpix\b|credito|debito|dinheiro|cartao|cartão|a vista|à vista/gi, ' ')
    .replace(/\d+\s*x\b|(?:em|de)\s+\d+\s*(?:vezes|parcelas|x)|\d+\s*parcelas/gi, ' ')
    .replace(/\bhoje\b|\bontem\b|\banteontem\b|\bdia\s+\d+\b|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/gi, ' ')
    .replace(/\b(gastei|paguei|comprei|gasto de|gasto|comprar|pagar|registrar|anota|anotar|adiciona|no|na|com|de|em|um|uma|o|a|pra|para|reais)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!d) d = category !== 'Outros' ? category.toLowerCase() : 'gasto'
  return d.charAt(0).toUpperCase() + d.slice(1)
}

// ---- Intenções ---------------------------------------------------------

function isCancel(t: string) {
  return /(cancela|cancelar|apaga|apagar|remove|remover|excluir|exclui|desfaz|desfazer)/.test(t)
}

function isRegister(t: string) {
  return /(gastei|paguei|comprei|gasto|registrar|anota|anotar|adiciona|adicionar)/.test(t)
}

function isSummary(t: string) {
  return /(quanto|resumo|resumir|gastos|extrato|categoria|balanco|balanço|relatorio|relatório|total)/.test(t)
}

function summaryRange(t: string) {
  const today = todayISO()
  if (/\bhoje\b/.test(t)) return { from: today, to: today, label: 'hoje' }
  if (/\bontem\b/.test(t)) {
    const y = shiftDays(today, -1)
    return { from: y, to: y, label: 'ontem' }
  }
  if (/(7 dias|semana|ultimos dias)/.test(t)) return { from: shiftDays(today, -6), to: today, label: 'os últimos 7 dias' }
  if (/(mes passado|mês passado|passado)/.test(t)) {
    const prev = addMonthsISO(today, -1)
    const r = monthRange(prev)
    return { ...r, label: 'o mês passado' }
  }
  const r = monthRange(today)
  return { ...r, label: 'este mês' }
}

// ---- Orquestrador ------------------------------------------------------

export async function runLocalAgent(message: string): Promise<AgentReply> {
  const t = norm(message)

  // 1) Cancelar
  if (isCancel(t)) {
    const removed = await cancelLastExpense()
    if (!removed) return { reply: 'Não encontrei nenhum gasto recente pra cancelar. 🤔' }
    return {
      reply: `Pronto, cancelei o último gasto: ${brl(removed.value)} — ${removed.description} (${removed.category}). 🗑️`,
    }
  }

  const value = parseValue(t)

  // 2) Registrar gasto — precisa de um valor e de intenção de registrar
  //    (uma pergunta como "quanto gastei?" cai no resumo, não aqui).
  if (value != null && (isRegister(t) || !isSummary(t))) {
    const installments = parseInstallments(t)
    const parsed: ParsedExpense = {
      value,
      description: parseDescription(message, t, parseCategory(t)),
      payment_method: parsePayment(t),
      category: parseCategory(t),
      installments,
      date: parseDate(t),
    }
    const rows = await addExpense(parsed)
    const parc =
      installments > 1
        ? ` em ${installments}x de ${brl(Number((value / installments).toFixed(2)))}`
        : ''
    return {
      reply: `Anotei: ${brl(value)} — ${parsed.description} em ${parsed.category} no ${parsed.payment_method}${parc}. ✅`,
      meta: { type: 'expense', expense: parsed, count: rows.length },
    }
  }

  // 3) Resumir
  if (isSummary(t) || value == null) {
    const { from, to, label } = summaryRange(t)
    const s = await summarize(from, to)
    if (s.count === 0) {
      return { reply: `Você não teve nenhum gasto em ${label}. 🥳` }
    }
    const linhas = s.byCategory
      .slice(0, 6)
      .map((c) => `• ${c.categoria}: ${brl(c.total)}`)
      .join('\n')
    const reply =
      `Em ${label} você gastou ${brl(s.total)} em ${s.count} lançamento(s).\n\n${linhas}` +
      (s.top ? `\n\nMaior categoria: ${s.top.categoria} (${brl(s.top.total)}).` : '')
    return {
      reply,
      meta: { type: 'chart', title: `Gastos — ${label}`, data: s.byCategory, total: s.total },
    }
  }

  // 4) Ajuda
  return {
    reply:
      'Oi! Sou o Ned, seu assistente financeiro. 💸\n\nPode falar comigo naturalmente:\n' +
      '• "gastei 50 no mercado no pix"\n' +
      '• "paguei 1200 num tênis em 3x no crédito"\n' +
      '• "quanto gastei esse mês?"\n' +
      '• "gastos por categoria"\n' +
      '• "cancela o último gasto"',
  }
}
