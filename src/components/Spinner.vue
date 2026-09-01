<script setup lang="ts">
withDefaults(defineProps<{ light?: boolean; size?: number }>(), { light: false, size: 22 })
</script>

<template>
  <span
    role="status"
    aria-label="Carregando"
    class="inline-block animate-spin rounded-full border-2"
    :class="light ? 'border-white/40 border-t-white' : 'border-primary/25 border-t-primary'"
    :style="{ width: `${size}px`, height: `${size}px` }"
  ></span>
</template>
