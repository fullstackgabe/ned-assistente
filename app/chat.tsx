import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image, Animated, ActivityIndicator,
  ScrollView, Linking, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import {
  askNed, loadHistory, saveMessage, registerExpense, clearConversation, isSubscribed, recordVisit, AskInput,
} from '@/lib/agent'
import { SUBSCRIBE_URL } from '@/lib/config'
import { ChatMessage, ParsedExpense, brl, paymentLabel, shortDate, categoryColor } from '@/types'

const PRIMARY = '#4f46e5'
const DANGER = '#dc2626'

type ChatItem = ChatMessage & { imageUri?: string; cta?: boolean }

const WELCOME: ChatItem = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá, eu sou o Ned 👋\nSeu Assistente Financeiro...\nMe envia uma foto do comprovante, ou me explica seu gasto por áudio/texto, que eu registro pra você rapidinho. ⚡',
}

const PRESENTATION =
  'Olá, eu sou o Ned 👋\n\n' +
  'Ainda não sou o seu assistente financeiro... mas adoraria ser! 😄\n\n' +
  'Registro gastos por foto, áudio e texto.\n\n' +
  'Pra me ter de vez, basta ativar um plano, é baratinho e super vale a pena! É só tocar no botão abaixo. 👇'

const FAREWELL = 'Te vejo em breve! 😊'

const SUGGESTIONS = [
  'iFood 45 no crédito',
  'mercado 80 no débito',
  'tênis 300 no crédito em 3x',
  'lanche 25 no pix',
  'café 12 no dinheiro',
  'uber 30 no crédito',
]

const uid = () => `${Date.now()}-${Math.round(Math.random() * 1e6)}`

const timeOf = (m: ChatItem): string => {
  let d: Date | null = null
  if (m.created_at) d = new Date(m.created_at)
  else if (/^\d{10,}/.test(m.id)) d = new Date(Number(m.id.split('-')[0]))
  if (!d || isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => { const s = String(r.result); resolve(s.slice(s.indexOf(',') + 1)) }
    r.onerror = reject
    r.readAsDataURL(blob)
  })

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatItem[]>([WELCOME])
  const [input, setInput] = useState('')
  const [inputHeight, setInputHeight] = useState(38)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const [showClear, setShowClear] = useState(false)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)

  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const mediaRecorderRef = useRef<any>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const nativeRecRef = useRef<Audio.Recording | null>(null)

  useEffect(() => {
    ;(async () => {
      let sub = true
      try { sub = await isSubscribed() } catch { sub = true }
      setSubscribed(sub)
      if (sub) {
        const rows = await loadHistory()
        setMessages([WELCOME, ...(rows as ChatItem[])])
      } else {
        setMessages([{ id: 'paywall', role: 'assistant', content: PRESENTATION, cta: true }])
        recordVisit().catch(() => {})
      }
    })()
  }, [])

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60)

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
  const typingDelay = (text: string) => Math.min(1200, 400 + (text?.length || 0) * 9)

  const revealBot = async (msg: ChatItem) => {
    setTyping(true)
    scrollToEnd()
    await sleep(typingDelay(msg.content))
    setMessages((m) => [...m, msg])
    setTyping(false)
    scrollToEnd()
  }

  const runAsk = async (payload: AskInput, userText: string, imageUri?: string) => {
    if (sending || typing) return
    const userMsg: ChatItem = { id: uid(), role: 'user', content: userText, imageUri }
    setMessages((m) => [...m, userMsg])
    setSending(true)
    setTyping(true)
    scrollToEnd()
    saveMessage('user', userText)

    try {
      const { reply, meta } = await askNed(payload)
      await revealBot({ id: uid(), role: 'assistant', content: reply, meta })
      if (meta?.type !== 'pending') saveMessage('assistant', reply, meta)
    } catch {
      await revealBot({ id: uid(), role: 'assistant', content: 'Ops, algo deu errado. Tenta de novo?' })
    } finally {
      setSending(false)
    }
  }

  const sendText = () => {
    const t = input.trim()
    if (!t || sending || typing || recording) return
    setInput('')
    runAsk({ text: t }, t)
  }

  const confirmPending = async (id: string, expense: ParsedExpense) => {
    setBusyId(id)
    try {
      await registerExpense(expense)
      setMessages((m) => m.filter((x) => x.id !== id)) // tira a mensagem com os botões
      const parc = expense.installments > 1 ? ` (${expense.installments} parcelas)` : ''
      const content = `Pronto, registrei! ${brl(expense.value)} — ${expense.description} · ${expense.category} · ${paymentLabel(expense.payment_method, expense.installments)}${parc}. ✅`
      await revealBot({ id: uid(), role: 'assistant', content, meta: null })
      saveMessage('assistant', content, null)
    } catch {
      await revealBot({ id: uid(), role: 'assistant', content: 'Não consegui registrar agora. Tenta de novo?' })
    } finally {
      setBusyId(null)
    }
  }

  const cancelPending = async (id: string) => {
    setMessages((m) => m.filter((x) => x.id !== id))
    const content = 'Beleza, não registrei nada. Se quiser tentar de novo, é só pedir. 👍'
    await revealBot({ id: uid(), role: 'assistant', content, meta: null })
    saveMessage('assistant', content, null)
  }

  const pickImage = async () => {
    if (sending || recording || typing) return
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        base64: true,
      })
      if (res.canceled || !res.assets?.length) return
      const asset = res.assets[0]
      if (!asset.base64) return
      const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
      runAsk({ imageBase64: dataUrl }, '🧾 Enviei um comprovante', asset.uri)
    } catch {
      setMessages((m) => [...m, { id: uid(), role: 'assistant', content: 'Não consegui abrir a imagem. Tenta de novo?' }])
    }
  }

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e: BlobEvent) => { if (e.data.size) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const b64 = await blobToBase64(blob)
        runAsk({ audioBase64: b64, audioMime: blob.type }, '🎤 Mensagem de voz')
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
    } else {
      const perm = await Audio.requestPermissionsAsync()
      if (!perm.granted) throw new Error('sem permissão')
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      nativeRecRef.current = rec
      setRecording(true)
    }
  }

  const stopRecording = async () => {
    if (Platform.OS === 'web') {
      mediaRecorderRef.current?.stop()
      setRecording(false)
    } else {
      const rec = nativeRecRef.current
      setRecording(false)
      if (!rec) return
      await rec.stopAndUnloadAsync()
      const uriRec = rec.getURI()
      nativeRecRef.current = null
      if (!uriRec) return
      const b64 = await FileSystem.readAsStringAsync(uriRec, { encoding: FileSystem.EncodingType.Base64 })
      runAsk({ audioBase64: b64, audioMime: 'audio/m4a' }, '🎤 Mensagem de voz')
    }
  }

  const toggleRecording = async () => {
    if (sending || typing) return
    try { recording ? await stopRecording() : await startRecording() }
    catch {
      setRecording(false)
      setMessages((m) => [...m, { id: uid(), role: 'assistant', content: 'Não consegui acessar o microfone. Verifique a permissão e tente de novo.' }])
    }
  }

  const doClear = async () => {
    try { await clearConversation() } catch { /* ignore */ }
    setMessages([WELCOME])
    setShowClear(false)
  }

  const showSuggestions = messages.length <= 1

  if (subscribed === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#eceff5', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    )
  }

  const blocked = subscribed === false

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#eceff5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {messages.length > 1 && !blocked ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12, paddingTop: 8 }}>
          <TouchableOpacity onPress={() => setShowClear(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' }}>
            <Ionicons name="trash-outline" size={14} color={DANGER} />
            <Text style={{ color: DANGER, fontSize: 12, fontWeight: '600' }}>Limpar conversa</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <Bubble msg={item} busy={busyId === item.id} onConfirm={confirmPending} onCancel={cancelPending} />
        )}
        onContentSizeChange={scrollToEnd}
        ListFooterComponent={typing ? <TypingBubble /> : null}
      />

      {showSuggestions && !blocked ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 6, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} onPress={() => { setInput(s); inputRef.current?.focus() }} style={{ width: '48.5%', backgroundColor: '#eef2ff', borderRadius: 999, borderWidth: 1, borderColor: '#c7d2fe', paddingVertical: 9, alignItems: 'center' }}>
              <Text numberOfLines={1} style={{ color: PRIMARY, fontSize: 12.5, fontWeight: '600' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, gap: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff' }}>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          editable={!recording && !blocked}
          placeholder={blocked ? 'Assine para conversar com o Ned 🔒' : recording ? 'Gravando… toque em parar' : 'Fale com o Ned…'}
          placeholderTextColor="#94a3b8"
          multiline
          onSubmitEditing={sendText}
          onContentSizeChange={(e: any) => {
            const h = e?.nativeEvent?.contentSize?.height
            if (h) setInputHeight(Math.min(120, Math.max(38, Math.ceil(h))))
          }}
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e?.nativeEvent?.key === 'Enter' && !e?.nativeEvent?.shiftKey) {
              e.preventDefault?.()
              sendText()
            }
          }}
          style={{ flex: 1, height: inputHeight, maxHeight: 120, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 19, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, fontSize: 15, lineHeight: 20, backgroundColor: '#f8fafc', opacity: blocked ? 0.6 : 1 }}
        />
        <RoundBtn name="image-outline" onPress={pickImage} disabled={sending || recording || typing || blocked} />
        <RoundBtn name={recording ? 'stop' : 'mic-outline'} onPress={toggleRecording} disabled={sending || typing || blocked} danger={recording} />
        <TouchableOpacity
          onPress={sendText}
          disabled={!input.trim() || sending || typing || recording || blocked}
          style={{ backgroundColor: !input.trim() || sending || typing || recording || blocked ? '#c7d2fe' : PRIMARY, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-up" size={19} color="#fff" />
        </TouchableOpacity>
      </View>

      {showClear ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowClear(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 22, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>Limpar conversa</Text>
            <Text style={{ color: '#64748b', fontSize: 14, lineHeight: 20, marginBottom: 18 }}>
              Isso apaga todas as mensagens do chat.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowClear(false)} style={{ flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f1f5f9' }}>
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doClear} style={{ flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: DANGER }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  )
}

function RoundBtn({ name, onPress, disabled, danger }: { name: any; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? '#fee2e2' : '#eef2ff', opacity: disabled ? 0.45 : 1 }}
    >
      <Ionicons name={name} size={19} color={danger ? DANGER : PRIMARY} />
    </TouchableOpacity>
  )
}

const cleanDesc = (d: string) => (d || '').replace(/\s*\b\d*\s*x\b\s*$/i, '').trim() || (d || '')

function FieldLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 10, marginBottom: 3 }}>
      {children}
    </Text>
  )
}

function Bubble({ msg, busy, onConfirm, onCancel }: {
  msg: ChatItem
  busy: boolean
  onConfirm: (id: string, e: ParsedExpense) => void
  onCancel: (id: string) => void
}) {
  const isUser = msg.role === 'user'
  const pending = msg.meta?.type === 'pending'
  const exp = pending ? ((msg.meta as any).expense as ParsedExpense) : null
  const time = timeOf(msg)
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 7 }}>
      <View
        style={{
          maxWidth: exp || msg.cta ? '90%' : '82%',
          backgroundColor: isUser ? PRIMARY : '#fff',
          borderWidth: isUser ? 0 : 1,
          borderColor: '#e2e8f0',
          borderRadius: 16,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          paddingHorizontal: 12,
          paddingVertical: exp || msg.cta ? 12 : 7,
          shadowColor: '#0f172a',
          shadowOpacity: 0.06,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        {msg.imageUri ? (
          <Image source={{ uri: msg.imageUri }} style={{ width: 190, height: 190, borderRadius: 12, marginBottom: msg.content ? 6 : 0 }} resizeMode="cover" />
        ) : null}

        {exp ? (
          <View>
            <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 13.5 }}>Confirma pra mim? 👇</Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: categoryColor(exp.category) + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 12 }}>
              <Text style={{ color: categoryColor(exp.category), fontSize: 12.5, fontWeight: '700' }}>{exp.category}</Text>
            </View>
            <Text style={{ fontSize: 23, fontWeight: '900', color: '#0f172a', marginTop: 8 }}>{brl(exp.value)}</Text>
            <Text style={{ color: '#0f172a', fontSize: 15.5, fontWeight: '600', marginTop: 8 }}>{cleanDesc(exp.description)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Ionicons name="card-outline" size={15} color="#64748b" />
              <Text style={{ color: '#475569', fontSize: 14 }}>{paymentLabel(exp.payment_method, exp.installments)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <Ionicons name="calendar-outline" size={15} color="#64748b" />
              <Text style={{ color: '#475569', fontSize: 14 }}>{shortDate(exp.date)}</Text>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 12 }}>Se algo estiver errado, é só me dizer que eu mudo 🙂</Text>
          </View>
        ) : msg.cta ? (
          <View>
            <Text style={{ color: '#0f172a', fontSize: 15, lineHeight: 22 }}>{msg.content}</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(SUBSCRIBE_URL)}
              style={{ marginTop: 14, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="sparkles" size={17} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Assinar o Ned</Text>
            </TouchableOpacity>
            <Text style={{ color: '#0f172a', fontSize: 15, lineHeight: 22, marginTop: 14 }}>{FAREWELL}</Text>
          </View>
        ) : (
          <Text style={{ color: isUser ? '#fff' : '#0f172a', fontSize: 15, lineHeight: 21 }}>{msg.content}</Text>
        )}

        {time && !exp && !msg.cta ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end', marginTop: 2 }}>
            <Text style={{ fontSize: 10.5, color: isUser ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>{time}</Text>
            {isUser ? <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.85)" /> : null}
          </View>
        ) : null}
      </View>

      {pending ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            disabled={busy}
            onPress={() => onCancel(msg.id)}
            style={{ borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' }}
          >
            <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={busy}
            onPress={() => onConfirm(msg.id, (msg.meta as any).expense)}
            style={{ borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: PRIMARY, opacity: busy ? 0.6 : 1 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{busy ? 'Registrando…' : 'Confirmar'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

function TypingBubble() {
  return (
    <View style={{ alignItems: 'flex-start', marginBottom: 12 }}>
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 14 }}>
        <Dots />
      </View>
    </View>
  )
}

function Dots() {
  const dots = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current
  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    )
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [])
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      {dots.map((v, i) => (
        <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#94a3b8', opacity: v }} />
      ))}
    </View>
  )
}
