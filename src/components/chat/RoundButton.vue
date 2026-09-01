<script setup lang="ts">
defineProps<{ disabled?: boolean; danger?: boolean }>()
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full"
    :class="[danger ? 'bg-danger-fill text-danger' : 'bg-primary-soft text-primary', disabled ? 'opacity-45' : '']"
  >
    <slot />
  </button>
</template>
