<script setup lang="ts">
import { computed } from 'vue'
import type { ChartData } from '@/types'
import { categoryColor } from '@/types'
import { brl } from '@/lib/format'

const props = withDefaults(defineProps<{ data: ChartData[]; total?: number; size?: number }>(), { size: 168 })

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arc(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polar(cx, cy, r, end)
  const e = polar(cx, cy, r, start)
  const large = end - start <= 180 ? 0 : 1
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`
}

const clean = computed(() => props.data.filter((d) => d.total > 0))
const sum = computed(() => props.total ?? clean.value.reduce((a, b) => a + b.total, 0))
const geo = computed(() => ({ cx: props.size / 2, cy: props.size / 2, r: props.size / 2 - 10, stroke: 22 }))

const slices = computed(() => {
  let acc = 0
  return clean.value.map((d) => {
    const frac = sum.value > 0 ? d.total / sum.value : 0
    const start = acc * 360
    const end = (acc + frac) * 360
    acc += frac
    const { cx, cy, r } = geo.value
    return { d, frac, color: categoryColor(d.categoria), path: arc(cx, cy, r, start, Math.max(start + 0.5, end)) }
  })
})

const single = computed(() => (slices.value.length === 1 ? slices.value[0] : null))
</script>

<template>
  <div class="mt-3 flex flex-wrap items-center gap-4">
    <div class="relative" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
        <circle :cx="geo.cx" :cy="geo.cy" :r="geo.r" stroke="#eef2f7" :stroke-width="geo.stroke" fill="none" />
        <circle
          v-if="single"
          :cx="geo.cx"
          :cy="geo.cy"
          :r="geo.r"
          :stroke="single.color"
          :stroke-width="geo.stroke"
          fill="none"
        />
        <template v-else>
          <path
            v-for="(s, i) in slices"
            :key="i"
            :d="s.path"
            :stroke="s.color"
            :stroke-width="geo.stroke"
            fill="none"
            stroke-linecap="butt"
          />
        </template>
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-[11px] text-muted">total</span>
        <span class="text-[15px] font-extrabold text-ink">{{ brl(sum) }}</span>
      </div>
    </div>

    <div class="flex min-w-[180px] flex-1 flex-col gap-1.5">
      <div v-for="(s, i) in slices" :key="i" class="flex items-center">
        <span class="mr-2 h-2.5 w-2.5 shrink-0 rounded-[3px]" :style="{ background: s.color }"></span>
        <span class="flex-1 truncate text-[13px] text-ink-2">{{ s.d.categoria }}</span>
        <span class="text-[13px] font-bold text-ink">{{ brl(s.d.total) }}</span>
        <span class="w-[42px] text-right text-xs text-faint">{{ Math.round(s.frac * 100) }}%</span>
      </div>
    </div>
  </div>
</template>
