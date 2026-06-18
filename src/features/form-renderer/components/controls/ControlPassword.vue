<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ title?: string; modelValue: string; error?: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const show = ref(false)
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</label>
    <div class="relative flex items-center">
      <input
        :type="show ? 'text' : 'password'"
        :value="modelValue"
        class="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': error }"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="absolute right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
        tabindex="-1"
        @click="show = !show"
      >
        <!-- Eye open -->
        <svg v-if="!show" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <!-- Eye closed -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
        </svg>
      </button>
    </div>
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
