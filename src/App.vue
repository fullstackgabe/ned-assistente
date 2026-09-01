<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useExpensesStore } from '@/stores/expenses'
import { chatInputFocused } from '@/composables/useInputFocus'
import AppHeader from '@/components/AppHeader.vue'
import TabBar from '@/components/TabBar.vue'
import Spinner from '@/components/Spinner.vue'
import LoginView from '@/views/LoginView.vue'

const auth = useAuthStore()
const chat = useChatStore()
const expenses = useExpensesStore()

onMounted(() => auth.init())

watch(
  () => auth.loggedIn,
  (on) => {
    if (!on) {
      chat.reset()
      expenses.reset()
    }
  },
)
</script>

<template>
  <div v-if="!auth.ready" class="flex flex-1 items-center justify-center bg-white">
    <Spinner />
  </div>
  <LoginView v-else-if="!auth.loggedIn" />
  <template v-else>
    <AppHeader />
    <RouterView v-slot="{ Component }">
      <component :is="Component" class="min-h-0 flex-1" />
    </RouterView>
    <TabBar v-if="!chatInputFocused" />
  </template>
</template>
