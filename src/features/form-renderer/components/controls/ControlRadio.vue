<script setup lang="ts">
import type { SelectOption } from '../../types/schema'

defineProps<{
  title?: string
  modelValue: string | number
  options: SelectOption[]   // [{ id, name }] — id is the stored value, name the label
  id: string
}>()
defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>
    <div class="flex flex-wrap gap-4">
      <label
        v-for="opt in options"
        :key="opt.id"
        class="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
      >
        <input
          type="radio"
          :name="id"
          :value="opt.id"
          :checked="modelValue === opt.id"
          class="text-xp-primary focus:ring-xp-primary"
          @change="$emit('update:modelValue', opt.id)"
        />
        {{ opt.name }}
      </label>
    </div>
  </div>
</template>
