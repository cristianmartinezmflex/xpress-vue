<script setup lang="ts">
import { computed } from 'vue'
import type { Validation } from '../../types/schema'

const props = defineProps<{
  title?: string
  modelValue: number
  validations?: Validation[]
  error?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

// Min/max bounds come from the min_max validation (when the control declares one). null = unbounded.
const bounds = computed(() => {
  const v = props.validations?.find((x) => x.type === 'min_max')
  return { min: v?.min ?? null, max: v?.max ?? null }
})

function clamp(v: number): number {
  let out = v
  if (bounds.value.min != null && out < bounds.value.min) out = bounds.value.min
  if (bounds.value.max != null && out > bounds.value.max) out = bounds.value.max
  return out
}

// Arrows: step, then keep the result inside the range.
function step(delta: number) {
  const base = Number.isFinite(props.modelValue) ? props.modelValue : (bounds.value.min ?? 0)
  emit('update:modelValue', clamp(base + delta))
}

// Typing: never let the value exceed the max (upper bound is clamped live, so a value past the top of the
// range can't even be entered). Empty / below-min are NOT auto-corrected — they're left as-is so the
// validation message shows and Save stays disabled (WinForm parity: it won't persist an empty value).
function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') { emit('update:modelValue', NaN); return }
  const n = Number(raw)
  if (Number.isNaN(n)) { emit('update:modelValue', NaN); return }
  emit('update:modelValue', bounds.value.max != null && n > bounds.value.max ? bounds.value.max : n)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</label>
    <div class="flex items-stretch w-32 rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-xp-primary" :class="{ 'border-xp-red': error }">
      <input
        type="number"
        :value="modelValue"
        :min="bounds.min ?? undefined"
        :max="bounds.max ?? undefined"
        class="w-full px-3 py-2 text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        @input="onInput"
      />
      <div class="flex flex-col border-l border-gray-300 bg-gray-50 shrink-0">
        <button
          type="button"
          class="flex items-center justify-center w-7 flex-1 hover:bg-gray-100 border-b border-gray-300 text-gray-500 text-[10px]"
          @click="step(1)"
        >▲</button>
        <button
          type="button"
          class="flex items-center justify-center w-7 flex-1 hover:bg-gray-100 text-gray-500 text-[10px]"
          @click="step(-1)"
        >▼</button>
      </div>
    </div>
    <p v-if="error" class="text-xs text-xp-red">{{ error }}</p>
  </div>
</template>
