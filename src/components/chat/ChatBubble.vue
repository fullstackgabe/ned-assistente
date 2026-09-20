<script setup lang="ts">
import { computed } from 'vue'
import { CheckCheck, Sparkles } from '@lucide/vue'
import type { ChatItem, ParsedExpense } from '@/types'
import { timeOf } from '@/lib/format'
import { SUBSCRIBE_URL } from '@/lib/config'
import { FAREWELL } from '@/stores/chat'
import ExpenseCard from './ExpenseCard.vue'
import VoiceWave from './VoiceWave.vue'

const props = defineProps<{ msg: ChatItem; busy: boolean }>()
const emit = defineEmits<{ confirm: [id: string, expense: ParsedExpense]; cancel: [id: string]; imageLoad: [] }>()

const isUser = computed(() => props.msg.role === 'user')
const pendingExp = computed<ParsedExpense | null>(() =>
  props.msg.meta?.type === 'pending' ? props.msg.meta.expense : null,
)
const registeredExp = computed<ParsedExpense | null>(() =>
  props.msg.meta?.type === 'expense' ? props.msg.meta.expense : null,
)
const cardExp = computed(() => pendingExp.value ?? registeredExp.value)
const wide = computed(() => !!cardExp.value || !!props.msg.cta)
const time = computed(() => timeOf(props.msg))
const showText = computed(
  () => !cardExp.value && !props.msg.cta && !props.msg.imageUri && props.msg.voiceDuration == null,
)

function confirm() {
  if (pendingExp.value) emit('confirm', props.msg.id, pendingExp.value)
}
</script>

<template>
  <div class="mb-[7px] flex flex-col" :class="isUser ? 'items-end' : 'items-start'">
    <div
      class="relative rounded-2xl px-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
      :class="[
        wide ? 'max-w-[90%] py-3' : 'max-w-[82%] py-[7px]',
        isUser ? 'rounded-br-[4px] bg-primary text-white' : 'rounded-bl-[4px] border border-line bg-white text-ink',
      ]"
    >
      <div v-if="msg.imageUri" class="relative">
        <img
          :src="msg.imageUri"
          alt="Comprovante enviado"
          class="h-[190px] w-[190px] rounded-xl object-cover"
          @load="emit('imageLoad')"
        />
        <div class="absolute inset-x-0 bottom-0 h-10 rounded-b-xl bg-linear-to-t from-black/50 to-transparent"></div>
        <div v-if="time" class="absolute bottom-1.5 right-2 flex items-center gap-[3px]">
          <span class="text-[10.5px] text-white">{{ time }}</span>
          <CheckCheck v-if="isUser" :size="13" class="text-[#53bdeb]" />
        </div>
      </div>

      <VoiceWave v-if="msg.voiceDuration != null" :is-user="isUser" :seconds="msg.voiceDuration" :time="time" />

      <ExpenseCard v-if="cardExp" :expense="cardExp" :pending="!!pendingExp" />

      <div v-else-if="msg.cta">
        <p class="whitespace-pre-line text-[15px] leading-[22px] text-ink">{{ msg.content }}</p>
        <a
          :href="SUBSCRIBE_URL"
          target="_blank"
          rel="noopener"
          class="mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-extrabold text-white"
        >
          <Sparkles :size="17" />
          Quero o Ned
        </a>
        <p class="mt-3.5 text-[15px] leading-[22px] text-ink">{{ FAREWELL }}</p>
      </div>

      <p v-else-if="showText" class="whitespace-pre-line text-[15px] leading-[21px]" :class="isUser ? 'text-white' : 'text-ink'">{{ msg.content }}<span class="inline-block" :class="isUser ? 'w-[52px]' : 'w-[36px]'"></span></p>

      <div v-if="time && showText" class="absolute bottom-[5px] right-[10px] flex items-center gap-[3px]">
        <span class="text-[10.5px]" :class="isUser ? 'text-white/70' : 'text-faint'">{{ time }}</span>
        <CheckCheck v-if="isUser" :size="13" class="text-[#53bdeb]" />
      </div>
    </div>

    <div v-if="pendingExp" class="mt-2 flex gap-2">
      <button
        type="button"
        :disabled="busy"
        class="rounded-xl border border-line bg-white px-[18px] py-2.5 text-[13px] font-bold text-ink-3"
        @click="emit('cancel', msg.id)"
      >
        Cancelar
      </button>
      <button
        type="button"
        :disabled="busy"
        class="rounded-xl bg-primary px-[18px] py-2.5 text-[13px] font-extrabold text-white"
        :class="busy ? 'opacity-60' : ''"
        @click="confirm"
      >
        {{ busy ? 'Registrando…' : 'Confirmar' }}
      </button>
    </div>
  </div>
</template>
