import AsyncStorage from '@react-native-async-storage/async-storage'
import { ChatMessage, Expense, MessageMeta } from '@/types'
import { DEMO_UID } from '@/lib/config'

const K_EXP = 'demo_expenses_v1'
const K_CHAT = 'demo_chat_v1'

const uid = () => `${Date.now()}-${Math.round(Math.random() * 1e9)}`
const todayISO = () => new Date().toISOString().slice(0, 10)
function shiftDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

type Seed = [string, number, string, Expense['payment_method'], number, number, number]
const SEED: Seed[] = [
  ['Compras do mês', 412.9, 'Mercado', 'crédito', 1, 1, -2],
  ['iFood almoço', 38.5, 'Alimentação', 'pix', 1, 1, -1],
  ['Uber pro trabalho', 22.8, 'Transporte', 'crédito', 1, 1, -3],
  ['Farmácia', 64.3, 'Saúde', 'débito', 1, 1, -4],
  ['Cinema', 45, 'Lazer', 'pix', 1, 1, -5],
  ['Gasolina', 150, 'Transporte', 'crédito', 1, 1, -6],
  ['Padaria', 18.7, 'Alimentação', 'dinheiro', 1, 1, -7],
  ['Netflix', 39.9, 'Lazer', 'crédito', 1, 1, -8],
  ['Restaurante', 96.4, 'Alimentação', 'crédito', 1, 1, -9],
  ['Conta de luz', 187.2, 'Contas', 'débito', 1, 1, -10],
  ['Internet', 99.9, 'Contas', 'crédito', 1, 1, -11],
  ['Tênis de corrida (1/3)', 133.33, 'Roupas', 'crédito', 3, 1, -12],
  ['Academia', 89.9, 'Saúde', 'crédito', 1, 1, -13],
  ['Feira', 54, 'Mercado', 'pix', 1, 1, -14],
  ['Compras do mês', 388.1, 'Mercado', 'crédito', 1, 1, -34],
  ['Jantar aniversário', 210, 'Alimentação', 'crédito', 1, 1, -36],
  ['Uber', 31.5, 'Transporte', 'pix', 1, 1, -38],
  ['Gasolina', 160, 'Transporte', 'crédito', 1, 1, -40],
  ['Consulta médica', 250, 'Saúde', 'débito', 1, 1, -42],
  ['Camisa nova', 119.9, 'Roupas', 'crédito', 1, 1, -44],
  ['Show', 180, 'Lazer', 'pix', 1, 1, -46],
  ['Conta de água', 76.4, 'Contas', 'débito', 1, 1, -48],
  ['Spotify', 21.9, 'Lazer', 'crédito', 1, 1, -50],
  ['Curso online', 197, 'Educação', 'crédito', 1, 1, -52],
  ['Compras do mês', 402.75, 'Mercado', 'crédito', 1, 1, -64],
  ['Almoço restaurante', 72, 'Alimentação', 'pix', 1, 1, -66],
  ['Estacionamento', 25, 'Transporte', 'dinheiro', 1, 1, -68],
  ['Dentista', 320, 'Saúde', 'crédito', 1, 1, -70],
  ['Livro', 59.9, 'Educação', 'pix', 1, 1, -72],
  ['Conta de luz', 165.8, 'Contas', 'débito', 1, 1, -74],
  ['Pizza', 68, 'Alimentação', 'crédito', 1, 1, -76],
  ['Uber', 28.3, 'Transporte', 'pix', 1, 1, -78],
]

function buildSeed(): Expense[] {
  const now = Date.now()
  return SEED.map(([description, value, category, payment_method, installments, installment_no, days], i) => ({
    id: `seed-${i}`,
    user_id: DEMO_UID,
    description,
    value,
    category,
    payment_method,
    installments,
    installment_no,
    date: shiftDays(days),
    created_at: new Date(now - (SEED.length - i) * 1000).toISOString(),
  }))
}

async function readExpenses(): Promise<Expense[]> {
  const raw = await AsyncStorage.getItem(K_EXP)
  if (raw == null) {
    const seed = buildSeed()
    await AsyncStorage.setItem(K_EXP, JSON.stringify(seed))
    return seed
  }
  try { return JSON.parse(raw) as Expense[] } catch { return [] }
}
async function writeExpenses(rows: Expense[]) {
  await AsyncStorage.setItem(K_EXP, JSON.stringify(rows))
}

export const demoStore = {
  async list(opts: { from?: string; to?: string; category?: string } = {}): Promise<Expense[]> {
    let rows = await readExpenses()
    if (opts.from) rows = rows.filter((r) => r.date >= opts.from!)
    if (opts.to) rows = rows.filter((r) => r.date <= opts.to!)
    if (opts.category) rows = rows.filter((r) => r.category === opts.category)
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1))
  },

  async insert(rows: Omit<Expense, 'id' | 'created_at'>[]): Promise<Expense[]> {
    const all = await readExpenses()
    const now = Date.now()
    const created = rows.map((r, i) => ({ ...r, id: uid(), created_at: new Date(now + i).toISOString() }))
    await writeExpenses([...all, ...created])
    return created
  },

  async last(): Promise<Expense | null> {
    const rows = await readExpenses()
    if (!rows.length) return null
    return rows.slice().sort((a, b) => ((a.created_at || '') < (b.created_at || '') ? 1 : -1))[0]
  },

  async update(id: string, patch: Partial<Omit<Expense, 'id' | 'created_at'>>): Promise<void> {
    const rows = await readExpenses()
    await writeExpenses(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  },

  async remove(id: string): Promise<void> {
    const rows = await readExpenses()
    await writeExpenses(rows.filter((r) => r.id !== id))
  },

  async removeGroup(m: { description: string; installments: number; payment_method: Expense['payment_method']; category: string }): Promise<void> {
    const rows = await readExpenses()
    await writeExpenses(
      rows.filter(
        (r) =>
          !(
            r.description === m.description &&
            r.installments === m.installments &&
            r.payment_method === m.payment_method &&
            r.category === m.category
          ),
      ),
    )
  },

  async chatList(): Promise<ChatMessage[]> {
    const raw = await AsyncStorage.getItem(K_CHAT)
    if (!raw) return []
    try { return JSON.parse(raw) as ChatMessage[] } catch { return [] }
  },

  async chatInsert(role: 'user' | 'assistant', content: string, meta?: MessageMeta): Promise<void> {
    const list = await this.chatList()
    list.push({ id: uid(), role, content, meta: meta ?? null, created_at: new Date().toISOString() })
    await AsyncStorage.setItem(K_CHAT, JSON.stringify(list))
  },

  async chatClear(): Promise<void> {
    await AsyncStorage.removeItem(K_CHAT)
  },
}
