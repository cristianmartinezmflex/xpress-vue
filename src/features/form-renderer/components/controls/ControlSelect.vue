<script setup lang="ts">
import type { SelectOption } from '../../types/schema'

defineProps<{
  title?: string
  modelValue: string | number
  values: SelectOption[]
  error?: string
}>()
defineEmits<{ 'update:modelValue': [value: string | number] }>()

function resolveValue(opt: SelectOption) {
  return opt.value !== undefined ? opt.value : opt.text
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</label>
    <select
      :value="modelValue"
      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      :class="{ 'border-red-500': error }"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="opt in values"
        :key="resolveValue(opt)"
        :value="resolveValue(opt)"
      >{{ opt.text }}</option>
    </select>
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
