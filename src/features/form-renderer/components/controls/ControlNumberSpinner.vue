<script setup lang="ts">
import type { Validation } from '../../types/schema'

const props = defineProps<{
  title?: string
  modelValue: number
  validations?: Validation[]
  error?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function step(delta: number) {
  emit('update:modelValue', props.modelValue + delta)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</label>
    <div class="flex items-stretch w-32 rounded-md border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500" :class="{ 'border-red-500': error }">
      <input
        type="number"
        :value="modelValue"
        class="w-full px-3 py-2 text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value === '' ? NaN : Number(($event.target as HTMLInputElement).value))"
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
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
