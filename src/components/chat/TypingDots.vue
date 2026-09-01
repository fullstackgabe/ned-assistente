<template>
  <div class="mb-3 flex justify-start">
    <div class="rounded-[18px] rounded-bl-[4px] border border-line bg-white px-4 py-3.5">
      <div class="flex items-center gap-[5px]">
        <span
          v-for="i in 3"
          :key="i"
          class="ned-dot h-2 w-2 rounded-full bg-faint"
          :style="{ animationDelay: `${(i - 1) * 160}ms` }"
        ></span>
      </div>
    </div>
  </div>
</template>
