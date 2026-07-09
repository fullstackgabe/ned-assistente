import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Em produção vêm do .env (EXPO_PUBLIC_*). Antes do deploy usamos um
// placeholder válido só para o client construir e o app bootar até o login.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-placeholder'

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}
