import { ref } from 'vue'

export const chatInputFocused = ref(false)

let blurTimer: ReturnType<typeof setTimeout> | null = null

export function setChatInputFocused(v: boolean) {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  if (v) {
    chatInputFocused.value = true
    return
  }
  blurTimer = setTimeout(() => {
    chatInputFocused.value = false
    blurTimer = null
  }, 250)
}
