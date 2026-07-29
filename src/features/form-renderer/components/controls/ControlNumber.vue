<script setup lang="ts">
defineProps<{ title?: string; modelValue: number; error?: string }>()
defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</label>
    <input
      type="number"
      :value="modelValue"
      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-xp-primary"
      :class="{ 'border-xp-red': error }"
      @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
    <p v-if="error" class="text-xs text-xp-red">{{ error }}</p>
  </div>
</template>
