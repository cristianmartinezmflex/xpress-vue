<script setup lang="ts">
import type { Button } from '../../types/schema'

defineProps<{ buttons: Button[] }>()
const emit = defineEmits<{ action: [id: string, handler: string] }>()
</script>

<template>
  <div class="flex flex-wrap gap-2 pt-1">
    <button
      v-for="btn in buttons"
      :key="btn.id"
      type="button"
      class="cursor-pointer px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition"
      @click="emit('action', btn.id, btn.onClick)"
    >
      {{ btn.title }}
    </button>
  </div>
</template>
