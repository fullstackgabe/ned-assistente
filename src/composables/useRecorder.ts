import { ref } from 'vue'

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => {
      const s = String(r.result)
      resolve(s.slice(s.indexOf(',') + 1))
    }
    r.onerror = reject
    r.readAsDataURL(blob)
  })

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

export function useRecorder(onDone: (base64: string, mime: string, seconds: number) => void) {
  const recording = ref(false)
  const seconds = ref(0)
  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: BlobPart[] = []
  let timer: number | undefined

  function stopTimer() {
    if (timer === undefined) return
    clearInterval(timer)
    timer = undefined
  }

  async function start() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mime = pickMime()
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    chunks = []
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size) chunks.push(e.data)
    }
    recorder.onstop = async () => {
      stream?.getTracks().forEach((t) => t.stop())
      const type = recorder?.mimeType || mime || 'audio/webm'
      const blob = new Blob(chunks, { type })
      const b64 = await blobToBase64(blob)
      onDone(b64, blob.type || type, Math.max(1, seconds.value))
    }
    seconds.value = 0
    recorder.start()
    recording.value = true
    timer = window.setInterval(() => {
      seconds.value += 1
    }, 1000)
  }

  function stop() {
    recording.value = false
    stopTimer()
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  async function toggle() {
    if (recording.value) stop()
    else await start()
  }

  return { recording, seconds, start, stop, toggle }
}
