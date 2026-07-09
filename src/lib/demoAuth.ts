// Sessão local para o modo demo offline (sem Supabase). Mantém um flag
// persistido e notifica os assinantes (AuthGate), imitando o onAuthStateChange.
import AsyncStorage from '@react-native-async-storage/async-storage'

const K = 'demo_session_v1'
const listeners = new Set<(loggedIn: boolean) => void>()

export const demoAuth = {
  async getSession(): Promise<boolean> {
    return (await AsyncStorage.getItem(K)) === '1'
  },
  async signIn() {
    await AsyncStorage.setItem(K, '1')
    listeners.forEach((l) => l(true))
  },
  async signOut() {
    await AsyncStorage.removeItem(K)
    listeners.forEach((l) => l(false))
  },
  subscribe(cb: (loggedIn: boolean) => void) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}
