<script setup lang="ts">
defineProps<{ title?: string; modelValue: boolean; disabled?: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="flex items-center gap-2 select-none" :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      @change="!disabled && $emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span v-if="title" class="text-sm text-gray-700">{{ title }}</span>
  </label>
</template>
