<script setup lang="ts">
import type { Button } from '../../types/schema'
import { evaluateEnable } from '../../composables/useDisabled'

const props = defineProps<{
  buttons: Button[]
  state?: Record<string, any>
}>()
const emit = defineEmits<{ action: [id: string, handler: string] }>()

function isButtonEnabled(btn: Button): boolean {
  return evaluateEnable(btn.enable, props.state ?? {})
}
</script>

<template>
  <div class="flex flex-wrap gap-2 pt-1">
    <button
      v-for="btn in buttons"
      :key="btn.id"
      type="button"
      class="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 transition"
      :class="isButtonEnabled(btn)
        ? 'cursor-pointer hover:bg-gray-50'
        : 'opacity-50 cursor-not-allowed pointer-events-none'"
      :disabled="!isButtonEnabled(btn)"
      @click="emit('action', btn.id, btn.onClick)"
    >
      {{ btn.title }}
    </button>
  </div>
</template>
