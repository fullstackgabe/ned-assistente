<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { Trash2 } from '@lucide/vue'
import { useChatStore } from '@/stores/chat'
import ChatBubble from '@/components/chat/ChatBubble.vue'
import TypingDots from '@/components/chat/TypingDots.vue'
import SuggestionChips from '@/components/chat/SuggestionChips.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import ModalSheet from '@/components/ModalSheet.vue'
import Spinner from '@/components/Spinner.vue'

const chat = useChatStore()
const listEl = ref<HTMLDivElement | null>(null)
const inputEl = ref<InstanceType<typeof ChatInput> | null>(null)

function scrollToEnd(smooth = true) {
  nextTick(() => {
    const el = listEl.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

onMounted(async () => {
  await chat.init()
  scrollToEnd(false)
})

watch(() => [chat.messages.length, chat.typing], () => scrollToEnd())

function pick(text: string) {
  chat.draft = text
  inputEl.value?.focus()
}
</script>

<template>
  <div class="relative flex flex-col bg-chat">
    <div v-if="chat.subscribed === null" class="flex flex-1 items-center justify-center">
      <Spinner />
    </div>
    <template v-else>
      <div v-if="chat.canClear" class="flex px-3 pt-2">
        <button
          type="button"
          class="flex items-center gap-[5px] rounded-full border border-danger-border bg-danger-soft px-2.5 py-[5px] text-xs font-semibold text-danger"
          @click="chat.showClear = true"
        >
          <Trash2 :size="14" />
          Limpar conversa
        </button>
      </div>

      <div ref="listEl" class="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4 pb-2">
        <ChatBubble
          v-for="m in chat.messages"
          :key="m.id"
          :msg="m"
          :busy="chat.busyId === m.id"
          @confirm="chat.confirmPending"
          @cancel="chat.cancelPending"
          @image-load="scrollToEnd()"
        />
        <TypingDots v-if="chat.typing" />
      </div>

      <SuggestionChips v-if="chat.showSuggestions" @pick="pick" />

      <ChatInput ref="inputEl" />

      <ModalSheet v-if="chat.showClear" @close="chat.showClear = false">
        <h2 class="mb-2 text-lg font-extrabold text-ink">Limpar conversa</h2>
        <p class="mb-[18px] text-sm leading-5 text-muted">Isso apaga todas as mensagens do chat.</p>
        <div class="flex gap-2.5">
          <button type="button" class="btn-secondary" @click="chat.showClear = false">Cancelar</button>
          <button type="button" class="btn-danger" @click="chat.clear()">Limpar</button>
        </div>
      </ModalSheet>
    </template>
  </div>
</template>
