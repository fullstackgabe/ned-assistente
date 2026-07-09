import { useEffect, useState, ReactNode } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import { supabase } from '@/lib/supabase'
import { isDemo } from '@/lib/config'
import { demoAuth } from '@/lib/demoAuth'

const DEMO_EMAIL = 'demo@demo.com'
const DEMO_PASS = 'demo1234'
const PRIMARY = '#4f46e5'

export default function AuthGate({ children }: { children: ReactNode }) {
  const hasAuth = !!(supabase as any)?.auth?.getSession
  const [session, setSession] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (isDemo) {
      demoAuth.getSession().then((on) => { if (mounted) { setSession(on || null); setReady(true) } })
      const unsub = demoAuth.subscribe((on) => setSession(on || null))
      return () => { mounted = false; unsub() }
    }
    if (!hasAuth) { setReady(true); return }
    supabase.auth.getSession().then(({ data }: any) => {
      if (mounted) { setSession(data?.session || null); setReady(true) }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) => setSession(s))
    return () => { mounted = false; sub?.subscription?.unsubscribe?.() }
  }, [])

  const doLogin = async (em: string, pw: string) => {
    setBusy(true); setError(null)
    if (isDemo) { await demoAuth.signIn(); setBusy(false); return }
    const { error } = await supabase.auth.signInWithPassword({ email: em.trim(), password: pw })
    if (error) setError('Não foi possível entrar. Confira e-mail e senha.')
    setBusy(false)
  }

  const doRegister = async () => {
    setBusy(true); setError(null)
    if (isDemo) { await demoAuth.signIn(); setBusy(false); return }
    const { error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) { setError(error.message); setBusy(false); return }
    await doLogin(email, password)
  }

  if (!hasAuth || session) return <>{children}</>
  if (!ready) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator color={PRIMARY} />
    </View>
  )

  const canSubmit = /.+@.+\..+/.test(email) && password.length >= 6

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 34 }}>🤖</Text>
        </View>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a' }}>Ned</Text>
        <Text style={{ color: '#64748b', marginTop: 4, textAlign: 'center' }}>
          {mode === 'login' ? 'Seu assistente financeiro com IA no chat' : 'Crie sua conta'}
        </Text>
        {isDemo ? (
          <View style={{ marginTop: 12, backgroundColor: '#eef2ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: PRIMARY, fontSize: 12, textAlign: 'center' }}>
              Modo demonstração local — toque em “Entrar como demo”.
            </Text>
          </View>
        ) : null}
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        keyboardType="email-address"
        style={inputStyle}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Senha"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#dc2626', marginBottom: 8 }}>{error}</Text> : null}

      <TouchableOpacity
        disabled={!canSubmit || busy}
        onPress={() => (mode === 'login' ? doLogin(email, password) : doRegister())}
        style={{ backgroundColor: !canSubmit || busy ? '#a5b4fc' : PRIMARY, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        disabled={busy}
        onPress={() => doLogin(DEMO_EMAIL, DEMO_PASS)}
        style={{ borderWidth: 1, borderColor: PRIMARY, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
      >
        <Text style={{ color: PRIMARY, fontWeight: '700', fontSize: 15 }}>Entrar como demo</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setError(null); setMode(mode === 'login' ? 'register' : 'login') }} style={{ alignItems: 'center', marginTop: 18 }}>
        <Text style={{ color: '#64748b' }}>{mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tenho conta'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const inputStyle = {
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginBottom: 12,
  fontSize: 15,
} as const
