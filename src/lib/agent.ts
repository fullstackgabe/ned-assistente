import { supabase } from '@/lib/supabase'
import { runLocalAgent, AgentReply } from '@/lib/localAgent'
import { MessageMeta } from '@/types'

/**
 * Envia a mensagem do usuário ao Ned.
 *
 * Caminho principal: a Supabase Edge Function `agent` (OpenAI function
 * calling — o cérebro fiel ao n8n, com a chave da OpenAI como segredo da
 * função). Se a função não estiver publicada/acessível, cai no cérebro
 * LOCAL (`runLocalAgent`) para a demo nunca quebrar.
 */
export async function askNed(message: string): Promise<{ reply: string; meta: MessageMeta }> {
  try {
    const { data, error } = await supabase.functions.invoke('agent', {
      body: { message },
    })
    if (error) throw error
    if (data && typeof data.reply === 'string') {
      return { reply: data.reply, meta: (data.meta ?? null) as MessageMeta }
    }
    throw new Error('Resposta inválida da Edge Function')
  } catch {
    const local: AgentReply = await runLocalAgent(message)
    return { reply: local.reply, meta: (local.meta ?? null) as MessageMeta }
  }
}

// ---- Persistência do histórico de chat ---------------------------------

export async function loadHistory(limit = 50) {
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit)
  return data || []
}

export async function saveMessage(role: 'user' | 'assistant', content: string, meta?: MessageMeta) {
  const { data } = await supabase.auth.getUser()
  const user_id = data?.user?.id
  if (!user_id) return
  await supabase.from('chat_messages').insert({ user_id, role, content, meta: meta ?? null })
}
