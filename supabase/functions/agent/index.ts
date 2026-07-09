// ===========================================================================
// Edge Function `agent` — o cérebro do Ned.
//
// Porta o agente do n8n para uma Supabase Edge Function (Deno). Recebe a
// mensagem do app, carrega a memória de conversa, chama a OpenAI com function
// calling expondo as tools do Ned e executa as ações contra a tabela
// `expenses` (respeitando RLS via JWT do usuário).
//
// Deploy:  supabase functions deploy agent
// Segredo: supabase secrets set OPENAI_API_KEY=sk-...
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PAYMENTS = ['crédito', 'débito', 'pix', 'dinheiro']

// ---- Datas -------------------------------------------------------------
const todayISO = () => new Date().toISOString().slice(0, 10)
function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCMonth(base.getUTCMonth() + months)
  return base.toISOString().slice(0, 10)
}
function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}
function monthRange(ref: string) {
  const [y, m] = ref.split('-').map(Number)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}
function rangeForPeriod(period: string): { from: string; to: string; label: string } {
  const p = (period || 'mês').toLowerCase()
  const today = todayISO()
  if (p.includes('hoje')) return { from: today, to: today, label: 'hoje' }
  if (p.includes('ontem')) { const y = shiftDays(today, -1); return { from: y, to: y, label: 'ontem' } }
  if (p.includes('semana') || p.includes('7')) return { from: shiftDays(today, -6), to: today, label: 'os últimos 7 dias' }
  if (p.includes('passado')) { const r = monthRange(addMonthsISO(today, -1)); return { ...r, label: 'o mês passado' } }
  return { ...monthRange(today), label: 'este mês' }
}

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

// ---- Tools (schema exposto à OpenAI) -----------------------------------
const tools = [
  {
    type: 'function',
    function: {
      name: 'registrar_gasto',
      description: 'Registra um gasto do usuário. Se parcelado, gera uma linha por parcela.',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Valor numérico exato, sem símbolo de moeda. Ex.: 50.75, 120.' },
          description: { type: 'string', description: 'O que foi o gasto. Ex.: pizza, almoço no restaurante, tênis.' },
          payment_method: { type: 'string', enum: PAYMENTS, description: 'Método de pagamento.' },
          category: { type: 'string', description: 'Categoria (Alimentação, Transporte, Saúde, Roupas, Lazer, Mercado, Contas, Educação, Casa). Se não estiver clara, use "Outros".' },
          installments: { type: 'integer', description: 'Número de parcelas. À vista = 1.', default: 1 },
          date: { type: 'string', description: 'Data do gasto no formato YYYY-MM-DD. Default: hoje.' },
        },
        required: ['value', 'description', 'payment_method', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resumir_gastos',
      description: 'Resume os gastos de um período e devolve totais por categoria para gráfico.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Período: "hoje", "ontem", "semana", "mês" (default) ou "mês passado".' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gastos_por_periodo',
      description: 'Busca gastos entre duas datas específicas (YYYY-MM-DD) e resume por categoria.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Data inicial YYYY-MM-DD.' },
          to: { type: 'string', description: 'Data final YYYY-MM-DD.' },
        },
        required: ['from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_gasto',
      description: 'Cancela (exclui) o gasto mais recente do usuário.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

const SYSTEM = `Você é o Ned, um assistente financeiro pessoal em português do Brasil.
O usuário fala naturalmente sobre gastos ("gastei 50 no mercado no pix", "quanto gastei esse mês?", "cancela o último gasto").
Regras:
- Para registrar, extraia value, description, payment_method (um de: crédito, débito, pix, dinheiro), category e installments (à vista = 1). Se a categoria não estiver clara, use "Outros".
- NUNCA invente valores. Se faltar o valor, pergunte. Método de pagamento pode ser assumido como o mais provável se o usuário não disser.
- Após registrar, confirme de forma curta e amigável (ex.: "Anotei: R$ 50,00 em Alimentação no pix ✅").
- Para perguntas de resumo, use resumir_gastos ou gastos_por_periodo e responda com o total e as principais categorias.
- Seja objetivo, cordial e use no máximo 1 emoji por resposta. A data de hoje é ${todayISO()}.`

// ---- Execução das tools contra o banco ---------------------------------
async function execTool(sb: any, userId: string, name: string, args: any): Promise<{ result: any; meta: any }> {
  if (name === 'registrar_gasto') {
    const n = Math.max(1, Math.floor(args.installments || 1))
    const value = Number(args.value)
    const per = Number((value / n).toFixed(2))
    const category = args.category || 'Outros'
    const payment = PAYMENTS.includes(args.payment_method) ? args.payment_method : 'crédito'
    const date = args.date || todayISO()
    const rows = Array.from({ length: n }, (_, i) => ({
      user_id: userId,
      description: args.description,
      value: per,
      category,
      payment_method: payment,
      installments: n,
      installment_no: i + 1,
      date: addMonthsISO(date, i),
    }))
    const { error } = await sb.from('expenses').insert(rows)
    if (error) return { result: { ok: false, error: error.message }, meta: null }
    return {
      result: { ok: true, registrado: { value, category, payment_method: payment, installments: n } },
      meta: { type: 'expense', expense: { value, description: args.description, payment_method: payment, category, installments: n, date }, count: n },
    }
  }

  if (name === 'resumir_gastos' || name === 'gastos_por_periodo') {
    let from: string, to: string, label: string
    if (name === 'gastos_por_periodo') { from = args.from; to = args.to; label = `${from} a ${to}` }
    else { const r = rangeForPeriod(args.period || 'mês'); from = r.from; to = r.to; label = r.label }

    const { data } = await sb.from('expenses').select('*').gte('date', from).lte('date', to)
    const rows = data || []
    const totals: Record<string, number> = {}
    let total = 0
    for (const r of rows) { total += Number(r.value); totals[r.category] = (totals[r.category] || 0) + Number(r.value) }
    const byCategory = Object.entries(totals).map(([categoria, t]) => ({ categoria, total: Number((t as number).toFixed(2)) })).sort((a, b) => b.total - a.total)
    return {
      result: { label, total: Number(total.toFixed(2)), count: rows.length, por_categoria: byCategory },
      meta: rows.length ? { type: 'chart', title: `Gastos — ${label}`, data: byCategory, total: Number(total.toFixed(2)) } : null,
    }
  }

  if (name === 'cancelar_gasto') {
    const { data } = await sb.from('expenses').select('*').order('created_at', { ascending: false }).limit(1)
    const last = (data || [])[0]
    if (!last) return { result: { ok: false, motivo: 'nenhum gasto recente' }, meta: null }
    await sb.from('expenses').delete().eq('id', last.id)
    return { result: { ok: true, cancelado: { value: last.value, description: last.description } }, meta: null }
  }

  return { result: { ok: false, error: 'tool desconhecida' }, meta: null }
}

async function callOpenAI(messages: any[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, tools, tool_choice: 'auto', temperature: 0.2 }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  return await res.json()
}

// ---- Handler -----------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData } = await sb.auth.getUser()
    const user = userData?.user
    if (!user) return json({ error: 'não autenticado' }, 401)

    const { message } = await req.json()
    if (!message || typeof message !== 'string') return json({ error: 'mensagem inválida' }, 400)

    // memória de conversa (últimas mensagens)
    const { data: history } = await sb
      .from('chat_messages').select('role,content').order('created_at', { ascending: false }).limit(10)
    const mem = (history || []).reverse().map((h: any) => ({ role: h.role, content: h.content }))

    const messages: any[] = [{ role: 'system', content: SYSTEM }, ...mem, { role: 'user', content: message }]

    let meta: any = null
    // loop de function calling (no máx. 4 rodadas)
    for (let i = 0; i < 4; i++) {
      const completion = await callOpenAI(messages)
      const msg = completion.choices[0].message
      messages.push(msg)
      const calls = msg.tool_calls || []
      if (!calls.length) {
        const reply = msg.content || '...'
        await sb.from('chat_messages').insert([
          { user_id: user.id, role: 'user', content: message },
          { user_id: user.id, role: 'assistant', content: reply, meta },
        ])
        return json({ reply, meta })
      }
      for (const call of calls) {
        let parsed: any = {}
        try { parsed = JSON.parse(call.function.arguments || '{}') } catch { /* ignore */ }
        const { result, meta: m } = await execTool(sb, user.id, call.function.name, parsed)
        if (m) meta = m
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
      }
    }
    return json({ reply: 'Consegui processar, mas me perdi na conversa. Pode repetir?', meta })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
