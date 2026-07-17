<script setup lang="ts">
defineProps<{ title?: string; modelValue: string; error?: string; disabled?: boolean }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</label>
    <input
      type="text"
      :value="modelValue"
      :disabled="disabled"
      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      :class="{ 'border-red-500': error, 'bg-gray-100 text-gray-500 cursor-not-allowed': disabled }"
      @input="!disabled && $emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
