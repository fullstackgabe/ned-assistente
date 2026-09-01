<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="#app">
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-ink/45 p-5" @click.self="emit('close')">
      <div class="w-full max-w-[380px] rounded-[22px] bg-white px-5 pb-5 pt-4 shadow-2xl">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
