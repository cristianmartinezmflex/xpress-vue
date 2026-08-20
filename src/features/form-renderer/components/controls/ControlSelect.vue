<script setup lang="ts">
/**
 * ControlSelect — single-choice dropdown with a STATIC list of options (`options: [{ id, name }]`),
 * known at schema-authoring time. `id` is the stored value, `name` the label. For options fetched
 * from the API at runtime use `select_dynamic` instead.
 */
import type { SelectOption } from '../../types/schema'

defineProps<{
  title?: string
  modelValue: string | number
  options: SelectOption[]
  error?: string
}>()
defineEmits<{ 'update:modelValue': [value: string | number] }>()
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
        v-for="opt in options"
        :key="opt.id"
        :value="opt.id"
      >{{ opt.name }}</option>
    </select>
    <p v-if="error" class="text-xs text-xp-red">{{ error }}</p>
  </div>
</template>
