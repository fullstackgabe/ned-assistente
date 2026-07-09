import { supabase, currentUserId } from '@/lib/supabase'
import { demoStore } from '@/lib/demoStore'
import { isDemo } from '@/lib/config'
import { ChatMessage, Expense, MessageMeta, PaymentMethod } from '@/types'

export type ExpenseGroupMatch = {
  description: string
  installments: number
  payment_method: PaymentMethod
  category: string
}

type NewExpense = Omit<Expense, 'id' | 'created_at'>

export async function expensesInsert(rows: NewExpense[]): Promise<Expense[]> {
  if (isDemo) return demoStore.insert(rows)
  const { data, error } = await supabase.from('expenses').insert(rows).select('*')
  if (error) throw error
  return (data as Expense[]) || []
}

export async function expensesList(opts: { from?: string; to?: string; category?: string } = {}): Promise<Expense[]> {
  if (isDemo) return demoStore.list(opts)
  let q = supabase.from('expenses').select('*').order('date', { ascending: false })
  if (opts.from) q = q.gte('date', opts.from)
  if (opts.to) q = q.lte('date', opts.to)
  if (opts.category) q = q.eq('category', opts.category)
  const { data } = await q
  return (data as Expense[]) || []
}

export async function expensesLast(): Promise<Expense | null> {
  if (isDemo) return demoStore.last()
  const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(1)
  return (data as Expense[])?.[0] || null
}

export async function expensesUpdate(id: string, patch: Partial<NewExpense>): Promise<void> {
  if (isDemo) return demoStore.update(id, patch)
  const { error } = await supabase.from('expenses').update(patch).eq('id', id)
  if (error) throw error
}

export async function expensesDelete(id: string): Promise<void> {
  if (isDemo) return demoStore.remove(id)
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function expensesDeleteGroup(m: ExpenseGroupMatch): Promise<void> {
  if (isDemo) return demoStore.removeGroup(m)
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('description', m.description)
    .eq('installments', m.installments)
    .eq('payment_method', m.payment_method)
    .eq('category', m.category)
  if (error) throw error
}

export async function userId(): Promise<string | null> {
  if (isDemo) return 'demo-user-local'
  return currentUserId()
}

export async function mySubscriptionActive(): Promise<boolean> {
  if (isDemo) return true
  const { data } = await supabase.from('subscribers').select('active').maybeSingle()
  return !!(data as any)?.active
}

export async function recordLead(): Promise<void> {
  if (isDemo) return
  const { data } = await supabase.auth.getUser()
  const email = data?.user?.email
  if (!email) return
  await supabase.from('leads').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
}

export async function chatList(limit = 50): Promise<ChatMessage[]> {
  if (isDemo) return demoStore.chatList()
  const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(limit)
  return (data as ChatMessage[]) || []
}

export async function chatInsert(role: 'user' | 'assistant', content: string, meta?: MessageMeta): Promise<void> {
  if (isDemo) return demoStore.chatInsert(role, content, meta)
  const uid = await currentUserId()
  if (!uid) return
  await supabase.from('chat_messages').insert({ user_id: uid, role, content, meta: meta ?? null })
}

export async function chatClear(): Promise<void> {
  if (isDemo) return demoStore.chatClear()
  const uid = await currentUserId()
  if (!uid) return
  const { error } = await supabase.from('chat_messages').delete().eq('user_id', uid)
  if (error) throw error
}
