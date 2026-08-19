<script setup lang="ts">
/**
 * ControlSelect — single-choice dropdown with a STATIC list of options (`values`), known at
 * schema-authoring time. For options that must be fetched from the API at runtime use
 * `select_dynamic` instead.
 */
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
    <label v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</label>
    <select
      :value="modelValue"
      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
      :class="{ 'border-xp-red': error }"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="opt in values"
        :key="resolveValue(opt)"
        :value="resolveValue(opt)"
      >{{ opt.text }}</option>
    </select>
    <p v-if="error" class="text-xs text-xp-red">{{ error }}</p>
  </div>
</template>
