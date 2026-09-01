import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { isDemo } from '@/lib/config'
import { demoAuth } from '@/lib/demoAuth'

const LOGIN_ERROR = 'Não foi possível entrar com o Google. Tente de novo.'

export const useAuthStore = defineStore('auth', () => {
  const loggedIn = ref(false)
  const ready = ref(false)
  const busy = ref(false)
  const error = ref<string | null>(null)
  let started = false

  function cleanUrl() {
    const { hash, search, pathname } = window.location
    if (hash.includes('access_token') || hash.includes('error') || search.includes('code=')) {
      window.history.replaceState(null, '', pathname)
    }
  }

  async function init() {
    if (started) return
    started = true
    if (isDemo) {
      loggedIn.value = await demoAuth.getSession()
      demoAuth.subscribe((on) => {
        loggedIn.value = on
      })
      ready.value = true
      return
    }
    const { data } = await supabase.auth.getSession()
    loggedIn.value = !!data.session
    ready.value = true
    cleanUrl()
    supabase.auth.onAuthStateChange((_event, session) => {
      loggedIn.value = !!session
      busy.value = false
      cleanUrl()
    })
  }

  async function signInGoogle() {
    busy.value = true
    error.value = null
    try {
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (e) throw e
    } catch {
      error.value = LOGIN_ERROR
      busy.value = false
    }
  }

  async function signInDemo() {
    await demoAuth.signIn()
  }

  async function signOut() {
    if (isDemo) await demoAuth.signOut()
    else await supabase.auth.signOut()
  }

  return { loggedIn, ready, busy, error, isDemo, init, signInGoogle, signInDemo, signOut }
})
