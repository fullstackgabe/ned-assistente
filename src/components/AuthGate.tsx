import { useEffect, useState, ReactNode } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { isDemo } from '@/lib/config'
import { demoAuth } from '@/lib/demoAuth'

const PRIMARY = '#4f46e5'

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (isDemo) {
      demoAuth.getSession().then((on) => { if (mounted) { setSession(on || null); setReady(true) } })
      const unsub = demoAuth.subscribe((on) => setSession(on || null))
      return () => { mounted = false; unsub() }
    }
    supabase.auth.getSession().then(({ data }: any) => {
      if (mounted) { setSession(data?.session || null); setReady(true) }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) => setSession(s))
    return () => { mounted = false; sub?.subscription?.unsubscribe?.() }
  }, [])

  const signInGoogle = async () => {
    setBusy(true); setError(null)
    try {
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
      if (error) setError('Não foi possível entrar com o Google. Tente de novo.')
    } catch {
      setError('Não foi possível entrar com o Google. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  if (session) return <>{children}</>
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 36 }}>🤖</Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}>Ned</Text>
        <Text style={{ color: '#64748b', marginTop: 6, textAlign: 'center', fontSize: 15 }}>
          Seu assistente financeiro inteligente
        </Text>
      </View>

      {isDemo ? (
        <TouchableOpacity
          onPress={() => demoAuth.signIn()}
          style={{ backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Entrar no modo demo</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={signInGoogle}
          disabled={busy}
          style={{ flexDirection: 'row', gap: 10, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1, shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Entrar com o Google</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {error ? <Text style={{ color: '#dc2626', marginTop: 14, textAlign: 'center' }}>{error}</Text> : null}
    </ScrollView>
  )
}
