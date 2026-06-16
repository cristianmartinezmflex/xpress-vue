<script setup lang="ts">
defineProps<{ title?: string; modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="flex items-center gap-2 cursor-pointer select-none">
    <input
      type="checkbox"
      :checked="modelValue"
      class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span v-if="title" class="text-sm text-gray-700">{{ title }}</span>
  </label>
</template>
