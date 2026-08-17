import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'public-anon-placeholder'

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}
