import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ChatItem, MessageMeta, ParsedExpense } from '@/types'
import {
  askNed,
  loadHistory,
  saveMessage,
  registerExpense,
  clearConversation,
  isSubscribed,
  recordVisit,
  type AskInput,
} from '@/lib/agent'
import { uid } from '@/lib/format'

export const WELCOME: ChatItem = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Olá, eu sou o Ned 👋\nSeu Assistente Virtual Inteligente.\nMe envia uma foto do comprovante, ou me explica seu gasto por áudio ou texto, que eu registro pra você rapidinho. ⚡',
}

export const PRESENTATION =
  'Olá, eu sou o Ned 👋\n\n' +
  'Ainda não sou o seu assistente financeiro... mas adoraria ser! 😄\n\n' +
  'Registro gastos por foto, áudio e texto.\n\n' +
  'Pra me ter de vez, basta ativar um plano, é baratinho e super vale a pena! É só tocar no botão abaixo. 👇'

export const FAREWELL = 'Te vejo em breve! 😊'

export const SUGGESTIONS = [
  'iFood 80 crédito',
  'mercado 80 débito',
  'lanche 25 pix',
  'café 12 dinheiro',
  'tênis 300 1x',
  'notebook 1200 crédito 12x',
]

const SUCCESS_LINES = [
  'Registrado com sucesso! ✅\nSempre que precisar anotar um gasto, é só me chamar. 😊',
  'Prontinho, tá salvo! ✅\nTô por aqui sempre que precisar registrar algo. 😊',
  'Feito! ✅\nPode contar comigo pra anotar seus gastos quando quiser. 👊',
]

const GENERIC_ERROR = 'Ops, algo deu errado. Tenta de novo?'
const REGISTER_ERROR = 'Não consegui registrar agora. Tenta de novo?'
const CANCELLED = 'Beleza, não registrei nada. Se quiser tentar de novo, é só pedir. 👍'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const typingDelay = (text: string) => Math.min(1200, 400 + (text?.length || 0) * 9)

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatItem[]>([WELCOME])
  const draft = ref('')
  const sending = ref(false)
  const typing = ref(false)
  const recording = ref(false)
  const busyId = ref<string | null>(null)
  const subscribed = ref<boolean | null>(null)
  const showClear = ref(false)
  let initialized = false

  const blocked = computed(() => subscribed.value === false)
  const busy = computed(() => sending.value || typing.value)
  const showSuggestions = computed(() => messages.value.length <= 1 && !blocked.value)
  const canClear = computed(() => messages.value.length > 1 && !blocked.value)

  async function init() {
    if (initialized) return
    initialized = true
    let sub = true
    try {
      sub = await isSubscribed()
    } catch {
      sub = true
    }
    subscribed.value = sub
    if (sub) {
      const rows = await loadHistory()
      const items: ChatItem[] = rows.map((r) => {
        if (r.meta?.type === 'image') return { ...r, imageUri: r.meta.uri }
        if (r.meta?.type === 'voice') return { ...r, voiceDuration: r.meta.duration }
        return r
      })
      messages.value = [WELCOME, ...items]
    } else {
      messages.value = [{ id: 'paywall', role: 'assistant', content: PRESENTATION, cta: true }]
      recordVisit().catch(() => {})
    }
  }

  function reset() {
    initialized = false
    messages.value = [WELCOME]
    draft.value = ''
    sending.value = false
    typing.value = false
    recording.value = false
    busyId.value = null
    subscribed.value = null
    showClear.value = false
  }

  function push(msg: ChatItem) {
    messages.value = [...messages.value, msg]
  }

  async function revealBot(msg: ChatItem) {
    typing.value = true
    await sleep(typingDelay(msg.content))
    push(msg)
    typing.value = false
  }

  async function runAsk(payload: AskInput, userText: string, imageUri?: string, voiceDuration?: number) {
    if (busy.value) return
    const userMeta: MessageMeta = payload.imageBase64
      ? { type: 'image', uri: payload.imageBase64 }
      : voiceDuration != null
        ? { type: 'voice', duration: voiceDuration }
        : null
    push({ id: uid(), role: 'user', content: userText, imageUri, voiceDuration, meta: userMeta })
    sending.value = true
    typing.value = true
    saveMessage('user', userText, userMeta)
    try {
      const { reply, meta } = await askNed(payload)
      await revealBot({ id: uid(), role: 'assistant', content: reply, meta })
      if (meta?.type !== 'pending') saveMessage('assistant', reply, meta)
    } catch {
      await revealBot({ id: uid(), role: 'assistant', content: GENERIC_ERROR })
    } finally {
      sending.value = false
    }
  }

  function sendText() {
    const t = draft.value.trim()
    if (!t || busy.value || recording.value || blocked.value) return
    draft.value = ''
    runAsk({ text: t }, t)
  }

  async function confirmPending(id: string, expense: ParsedExpense) {
    busyId.value = id
    try {
      const count = await registerExpense(expense)
      messages.value = messages.value.filter((x) => x.id !== id)
      const meta: MessageMeta = { type: 'expense', expense, count }
      await revealBot({ id: uid(), role: 'assistant', content: '', meta })
      saveMessage('assistant', '', meta)
      const ok = SUCCESS_LINES[Math.floor(Math.random() * SUCCESS_LINES.length)]!
      await revealBot({ id: uid(), role: 'assistant', content: ok })
      saveMessage('assistant', ok)
    } catch {
      await revealBot({ id: uid(), role: 'assistant', content: REGISTER_ERROR })
    } finally {
      busyId.value = null
    }
  }

  async function cancelPending(id: string) {
    messages.value = messages.value.filter((x) => x.id !== id)
    await revealBot({ id: uid(), role: 'assistant', content: CANCELLED, meta: null })
    saveMessage('assistant', CANCELLED, null)
  }

  function botNote(content: string) {
    push({ id: uid(), role: 'assistant', content })
  }

  async function clear() {
    try {
      await clearConversation()
    } catch {
    }
    messages.value = [WELCOME]
    showClear.value = false
  }

  return {
    messages,
    draft,
    sending,
    typing,
    recording,
    busyId,
    subscribed,
    showClear,
    blocked,
    busy,
    showSuggestions,
    canClear,
    init,
    reset,
    runAsk,
    sendText,
    confirmPending,
    cancelPending,
    botNote,
    clear,
  }
})
