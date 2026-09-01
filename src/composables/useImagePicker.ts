const MAX_SIDE = 1280
const QUALITY = 0.6

function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) return reject(new Error('canvas'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', QUALITY))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image'))
    }
    img.src = url
  })
}

export function useImagePicker(onPicked: (dataUrl: string) => void, onError: () => void) {
  let input: HTMLInputElement | null = null

  async function handle() {
    const file = input?.files?.[0]
    if (!file) return
    try {
      onPicked(await compress(file))
    } catch {
      onError()
    }
  }

  function open() {
    if (!input) {
      input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.addEventListener('change', handle)
    }
    input.value = ''
    input.click()
  }

  return { open }
}
