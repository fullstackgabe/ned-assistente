import { useEffect, useState } from 'react'

type Listener = (v: boolean) => void

let focused = false
const listeners = new Set<Listener>()

export function setChatInputFocused(v: boolean) {
  if (focused === v) return
  focused = v
  listeners.forEach((l) => l(v))
}

export function useChatInputFocused() {
  const [state, setState] = useState(focused)
  useEffect(() => {
    listeners.add(setState)
    return () => { listeners.delete(setState) }
  }, [])
  return state
}
