const K = 'demo_session_v1'
const listeners = new Set<(loggedIn: boolean) => void>()

export const demoAuth = {
  async getSession(): Promise<boolean> {
    return localStorage.getItem(K) === '1'
  },
  async signIn() {
    localStorage.setItem(K, '1')
    listeners.forEach((l) => l(true))
  },
  async signOut() {
    localStorage.removeItem(K)
    listeners.forEach((l) => l(false))
  },
  subscribe(cb: (loggedIn: boolean) => void) {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}
