<script setup lang="ts">
import type { SelectOption } from '../../types/schema'

const props = defineProps<{
  title?: string
  modelValue: string | number
  values: SelectOption[]
  id: string
}>()
defineEmits<{ 'update:modelValue': [value: string | number] }>()

function resolveValue(opt: SelectOption) {
  return opt.value !== undefined ? opt.value : opt.text
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</span>
    <div class="flex flex-wrap gap-4">
      <label
        v-for="opt in values"
        :key="resolveValue(opt)"
        class="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
      >
        <input
          type="radio"
          :name="id"
          :value="resolveValue(opt)"
          :checked="modelValue === resolveValue(opt)"
          class="text-blue-600 focus:ring-blue-500"
          @change="$emit('update:modelValue', resolveValue(opt))"
        />
        {{ opt.text }}
      </label>
    </div>
  </div>
</template>
