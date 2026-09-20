<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Image as ImageIcon, Mic, Square, ArrowUp } from '@lucide/vue'
import { useChatStore } from '@/stores/chat'
import { setChatInputFocused } from '@/composables/useInputFocus'
import { useRecorder } from '@/composables/useRecorder'
import { useImagePicker } from '@/composables/useImagePicker'
import RoundButton from './RoundButton.vue'
import Spinner from '@/components/Spinner.vue'

const chat = useChatStore()
const textarea = ref<HTMLTextAreaElement | null>(null)
const sendingAudio = ref(false)

const recorder = useRecorder((base64, mime, seconds) =>
  chat.runAsk({ audioBase64: base64, audioMime: mime }, '🎤 Mensagem de voz', undefined, seconds),
)
const { seconds } = recorder
watch(recorder.recording, (v) => {
  chat.recording = v
})
watch(
  () => chat.busy,
  (v) => {
    if (!v) sendingAudio.value = false
  },
)

const picker = useImagePicker(
  (dataUrl) => chat.runAsk({ imageBase64: dataUrl }, '🧾 Enviei um comprovante', dataUrl),
  () => chat.botNote('Não consegui abrir a imagem. Tenta de novo?'),
)

const audioMode = computed(() => chat.recording || sendingAudio.value)
const timer = computed(() => `${Math.floor(seconds.value / 60)}:${String(seconds.value % 60).padStart(2, '0')}`)
const placeholder = computed(() => (chat.blocked ? 'Assine para desbloquear 🔒' : 'Digite aqui…'))
const canSend = computed(() => !!chat.draft.trim() && !chat.busy && !audioMode.value && !chat.blocked)

function resize() {
  const el = textarea.value
  if (!el) return
  el.style.height = '38px'
  el.style.height = `${Math.min(120, Math.max(38, el.scrollHeight))}px`
}

watch(
  () => chat.draft,
  () => nextTick(resize),
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    chat.sendText()
  }
}

async function toggleMic() {
  if (chat.busy || chat.blocked || sendingAudio.value) return
  if (chat.recording) {
    sendingAudio.value = true
    recorder.stop()
    return
  }
  try {
    await recorder.start()
  } catch {
    return
  }
}

function pickImage() {
  if (chat.busy || audioMode.value || chat.blocked) return
  picker.open()
}

function focus() {
  textarea.value?.focus()
}

defineExpose({ focus })

onBeforeUnmount(() => setChatInputFocused(false))
</script>

<template>
  <div class="flex items-end gap-1.5 border-t border-line bg-white px-2.5 py-2">
    <div
      v-if="audioMode"
      class="flex h-[38px] flex-1 items-center gap-2.5 rounded-[19px] border border-line bg-page px-3.5"
    >
      <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" :class="chat.recording ? 'animate-pulse' : ''"></span>
      <span class="text-base tabular-nums text-ink">{{ timer }}</span>
      <span class="text-sm text-faint">{{ chat.recording ? 'Gravando…' : 'Enviando…' }}</span>
    </div>
    <textarea
      v-else
      ref="textarea"
      v-model="chat.draft"
      rows="1"
      :readonly="chat.blocked"
      :placeholder="placeholder"
      class="min-h-[38px] max-h-[120px] flex-1 resize-none rounded-[19px] border border-line bg-page px-3.5 py-2 text-base leading-5 text-ink placeholder:text-faint"
      :class="chat.blocked ? 'opacity-60' : ''"
      @keydown="onKeydown"
      @focus="setChatInputFocused(true)"
      @blur="setChatInputFocused(false)"
      @input="resize"
    ></textarea>
    <RoundButton v-if="!audioMode" :disabled="chat.busy || chat.blocked" aria-label="Enviar imagem" @click="pickImage">
      <ImageIcon :size="19" />
    </RoundButton>
    <div v-if="sendingAudio" class="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
      <Spinner :size="20" />
    </div>
    <RoundButton
      v-else
      :disabled="chat.busy || chat.blocked"
      :danger="chat.recording"
      :aria-label="chat.recording ? 'Parar e enviar' : 'Gravar áudio'"
      @click="toggleMic"
    >
      <Square v-if="chat.recording" :size="17" fill="currentColor" />
      <Mic v-else :size="19" />
    </RoundButton>
    <button
      v-if="!audioMode"
      type="button"
      :disabled="!canSend"
      class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-white"
      :class="canSend ? 'bg-primary' : 'bg-primary-border'"
      aria-label="Enviar"
      @click="chat.sendText()"
    >
      <ArrowUp :size="19" />
    </button>
  </div>
</template>
