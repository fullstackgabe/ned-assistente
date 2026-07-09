
import { ParsedExpense, PaymentMethod, brl, paymentLabel } from '@/types'
import { todayISO } from '@/lib/repo'

export type AgentReply = { reply: string; meta?: any }

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

function parseValue(text: string): number | null {
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

function isModify(t: string) {
  return /(cancela|cancelar|apaga|apagar|remove|remover|excluir|exclui|deleta|deletar|desfaz|desfazer|edita|editar|atualiza|atualizar|altera|alterar|muda|mudar|corrige|corrigir)/.test(t)
}

function isSummary(t: string) {
  return /(quanto|resumo|resumir|gastos|extrato|categoria|balanco|balanço|relatorio|relatório|total)/.test(t)
}

const GO_TO_EXTRATO = 'Pra apagar um gasto, abra a aba Extrato e toque na lixeira do gasto. 📋'
const SUMMARY_IN_EXTRATO = 'Os resumos e gráficos ficam na aba Extrato — lá você vê os totais por período e categoria. 📊'

function confirmText(e: ParsedExpense): string {
  return `Confirmando: ${brl(e.value)} — ${e.description} · ${e.category} · ${paymentLabel(e.payment_method, e.installments)}. Posso registrar? Se algo estiver errado, é só me dizer o que mudar. 👍`
}

export async function runLocalAgent(message: string): Promise<AgentReply> {
  const t = norm(message)

  if (isModify(t)) return { reply: GO_TO_EXTRATO }

  const value = parseValue(t)

  if (value != null) {
    const installments = parseInstallments(t)
    const category = parseCategory(t)
    const parsed: ParsedExpense = {
      value,
      description: parseDescription(message, t, category),
      payment_method: parsePayment(t),
      category,
      installments,
      date: parseDate(t),
    }
    return { reply: confirmText(parsed), meta: { type: 'pending', expense: parsed } }
  }

  if (isSummary(t)) return { reply: SUMMARY_IN_EXTRATO }

  return {
    reply:
      'Me conta um gasto que eu registro na hora. Ex.:\n' +
      '• "gastei 50 no mercado no pix"\n' +
      '• "paguei 1200 num tênis em 3x no crédito"\n\n' +
      'Pra ver, editar ou apagar gastos, use a aba Extrato.',
  }
}
