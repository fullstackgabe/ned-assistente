import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { askNed, loadHistory, saveMessage } from '@/lib/agent'
import { ChatMessage } from '@/types'
import CategoryChart from '@/components/CategoryChart'
import ExpenseCard from '@/components/ExpenseCard'

const PRIMARY = '#4f46e5'

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Oi! Sou o Ned, seu assistente financeiro. 💸\nÉ só me contar seus gastos que eu anoto, organizo e resumo pra você.',
}

const SUGGESTIONS = [
  'gastei 50 no mercado no pix',
  'quanto gastei esse mês?',
  'gastos por categoria',
  'paguei 1200 num tênis em 3x no crédito',
]

const uid = () => `${Date.now()}-${Math.round(Math.random() * 1e6)}`

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    loadHistory().then((rows) => {
      if (rows.length) setMessages(rows as ChatMessage[])
    })
  }, [])

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60)

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || sending) return
    setInput('')
    const userMsg: ChatMessage = { id: uid(), role: 'user', content }
    setMessages((m) => [...m, userMsg])
    setSending(true)
    scrollToEnd()
    saveMessage('user', content)

    try {
      const { reply, meta } = await askNed(content)
      const botMsg: ChatMessage = { id: uid(), role: 'assistant', content: reply, meta }
      setMessages((m) => [...m, botMsg])
      saveMessage('assistant', reply, meta)
    } catch {
      setMessages((m) => [...m, { id: uid(), role: 'assistant', content: 'Ops, algo deu errado. Tenta de novo?' }])
    } finally {
      setSending(false)
      scrollToEnd()
    }
  }

  const showSuggestions = messages.length <= 1

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => <Bubble msg={item} />}
        onContentSizeChange={scrollToEnd}
        ListFooterComponent={sending ? <Typing /> : null}
      />

      {showSuggestions ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} onPress={() => send(s)} style={{ backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: PRIMARY, fontSize: 12.5, fontWeight: '600' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff' }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Fale com o Ned…"
          placeholderTextColor="#94a3b8"
          multiline
          onSubmitEditing={() => send(input)}
          style={{ flex: 1, maxHeight: 120, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, backgroundColor: '#f8fafc' }}
        />
        <TouchableOpacity
          onPress={() => send(input)}
          disabled={!input.trim() || sending}
          style={{ backgroundColor: !input.trim() || sending ? '#c7d2fe' : PRIMARY, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <View
        style={{
          maxWidth: '86%',
          backgroundColor: isUser ? PRIMARY : '#fff',
          borderWidth: isUser ? 0 : 1,
          borderColor: '#e2e8f0',
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: isUser ? '#fff' : '#0f172a', fontSize: 15, lineHeight: 21 }}>{msg.content}</Text>
      </View>

      {msg.meta?.type === 'expense' ? (
        <View style={{ maxWidth: '92%', width: '92%' }}>
          <ExpenseCard expense={msg.meta.expense} count={msg.meta.count} />
        </View>
      ) : null}

      {msg.meta?.type === 'chart' && msg.meta.data?.length ? (
        <View style={{ maxWidth: '96%', width: '96%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14, marginTop: 10 }}>
          {msg.meta.title ? <Text style={{ fontWeight: '800', color: '#0f172a' }}>{msg.meta.title}</Text> : null}
          <CategoryChart data={msg.meta.data} total={msg.meta.total} />
        </View>
      ) : null}
    </View>
  )
}

function Typing() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12 }}>
        <ActivityIndicator color={PRIMARY} size="small" />
      </View>
      <Text style={{ color: '#94a3b8', fontSize: 12 }}>Ned está digitando…</Text>
    </View>
  )
}
