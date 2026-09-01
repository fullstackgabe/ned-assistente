<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { isDemo } from '@/lib/config'
import Spinner from '@/components/Spinner.vue'
import GoogleG from '@/components/GoogleG.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="flex flex-1 flex-col justify-center overflow-y-auto bg-white p-6">
    <div class="mb-7 flex flex-col items-center">
      <div class="mb-3.5 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-robot">
        <span class="text-4xl leading-none">🤖</span>
      </div>
      <h1 class="text-[28px] font-extrabold text-ink">Ned</h1>
      <p class="mt-1.5 text-center text-[15px] text-muted">Seu assistente financeiro inteligente</p>
    </div>

    <button
      v-if="isDemo"
      type="button"
      class="rounded-[14px] bg-primary py-[15px] text-center text-[15px] font-bold text-white"
      @click="auth.signInDemo()"
    >
      Entrar no modo demo
    </button>
    <button
      v-else
      type="button"
      :disabled="auth.busy"
      class="flex items-center justify-center gap-2.5 rounded-[14px] bg-primary py-[15px] text-[15px] font-bold text-white shadow-[0_4px_8px_rgba(79,70,229,0.25)]"
      :class="auth.busy ? 'opacity-70' : ''"
      @click="auth.signInGoogle()"
    >
      <Spinner v-if="auth.busy" light :size="20" />
      <template v-else>
        <GoogleG />
        Entrar com o Google
      </template>
    </button>

    <p v-if="auth.error" class="mt-3.5 text-center text-danger">{{ auth.error }}</p>
  </div>
</template>
