import { supabase } from '@/lib/supabase'
import { runLocalAgent } from '@/lib/localAgent'
import { chatList, chatInsert, chatClear, mySubscriptionActive, recordLead } from '@/lib/db'
import { addExpense } from '@/lib/repo'
import { isDemo } from '@/lib/config'
import { MessageMeta, ParsedExpense } from '@/types'

export type AskInput = {
  text?: string
  imageBase64?: string
  audioBase64?: string
  audioMime?: string
}

export async function askNed(input: AskInput): Promise<{ reply: string; meta: MessageMeta }> {
  const { text, imageBase64, audioBase64, audioMime } = input

  if (!isDemo) {
    try {
      const { data, error } = await supabase.functions.invoke('agent', {
        body: {
          message: text ?? '',
          image: imageBase64 ?? null,
          audio: audioBase64 ?? null,
          audioMime: audioMime ?? null,
        },
      })
      if (error) throw error
      if (data && typeof data.reply === 'string') {
        return { reply: data.reply, meta: (data.meta ?? null) as MessageMeta }
      }
      throw new Error('Resposta inválida da Edge Function')
    } catch {
    }
  }

  if (imageBase64 || audioBase64) {
    return {
      reply: 'Pra ler comprovante por imagem ou áudio eu preciso de conexão com o servidor. Por enquanto, me conta o gasto por texto. 🙂',
      meta: null,
    }
  }
  const local = await runLocalAgent(text ?? '')
  return { reply: local.reply, meta: (local.meta ?? null) as MessageMeta }
}

export async function registerExpense(expense: ParsedExpense): Promise<number> {
  const rows = await addExpense(expense)
  return rows.length
}

export async function loadHistory(limit = 50) {
  return chatList(limit)
}

export async function saveMessage(role: 'user' | 'assistant', content: string, meta?: MessageMeta) {
  await chatInsert(role, content, meta)
}

export async function clearConversation() {
  await chatClear()
}

export async function isSubscribed(): Promise<boolean> {
  return mySubscriptionActive()
}

export async function recordVisit(): Promise<void> {
  return recordLead()
}
