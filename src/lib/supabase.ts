import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_PROJECT_URL || 'https://placeholder.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'public-anon-placeholder'

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}
