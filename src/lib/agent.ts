import { supabase } from '@/lib/supabase'
import { runLocalAgent, AgentReply } from '@/lib/localAgent'
import { chatList, chatInsert } from '@/lib/db'
import { isDemo } from '@/lib/config'
import { MessageMeta } from '@/types'

/**
 * Envia a mensagem do usuário ao Ned.
 *
 * Caminho principal: a Supabase Edge Function `agent` (OpenAI function
 * calling — o cérebro fiel ao n8n, com a chave da OpenAI como segredo da
 * função). Em modo demo (ou se a função não estiver publicada/acessível),
 * cai no cérebro LOCAL (`runLocalAgent`) para a demo nunca quebrar.
 */
export async function askNed(message: string): Promise<{ reply: string; meta: MessageMeta }> {
  if (!isDemo) {
    try {
      const { data, error } = await supabase.functions.invoke('agent', { body: { message } })
      if (error) throw error
      if (data && typeof data.reply === 'string') {
        return { reply: data.reply, meta: (data.meta ?? null) as MessageMeta }
      }
      throw new Error('Resposta inválida da Edge Function')
    } catch {
      // cai no fallback local
    }
  }
  const local: AgentReply = await runLocalAgent(message)
  return { reply: local.reply, meta: (local.meta ?? null) as MessageMeta }
}

// ---- Persistência do histórico de chat ---------------------------------

export async function loadHistory(limit = 50) {
  return chatList(limit)
}

export async function saveMessage(role: 'user' | 'assistant', content: string, meta?: MessageMeta) {
  await chatInsert(role, content, meta)
}
