<script setup lang="ts">
import { ref } from 'vue'
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

// Context menu state
const contextMenu = ref<{ btn: Button; x: number; y: number } | null>(null)

function onRightClick(event: MouseEvent, btn: Button) {
  if (!btn.rightClickMenu?.length) return
  event.preventDefault()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  contextMenu.value = { btn, x: rect.left, y: rect.bottom + 4 }
}

function closeContextMenu() {
  contextMenu.value = null
}

function handleContextMenuItem(handler: string) {
  const btn = contextMenu.value?.btn
  closeContextMenu()
  if (btn) emit('action', btn.id, handler)
}
</script>

<template>
  <div class="flex flex-wrap gap-2 pt-1">
    <div
      v-for="btn in buttons"
      :key="btn.id"
      class="relative group"
    >
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 transition"
        :class="isButtonEnabled(btn)
          ? 'cursor-pointer hover:bg-gray-50'
          : 'opacity-50 cursor-not-allowed pointer-events-none'"
        :disabled="!isButtonEnabled(btn)"
        @click="emit('action', btn.id, btn.onClick)"
        @contextmenu="onRightClick($event, btn)"
      >
        {{ btn.title }}
      </button>

      <!-- Tooltip -->
      <div
        v-if="btn.tooltip"
        class="pointer-events-none absolute top-full left-0 mt-2 z-50
               w-64 rounded-md bg-gray-800 px-3 py-2 text-xs text-white shadow-lg
               opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      >
        <div class="absolute bottom-full left-4 border-4 border-transparent border-b-gray-800" />
        {{ btn.tooltip }}
      </div>
    </div>
  </div>

  <!-- Context menu (teleported to body to avoid overflow clipping) -->
  <Teleport to="body">
    <div
      v-if="contextMenu"
      class="fixed inset-0 z-[60]"
      @mousedown="closeContextMenu"
    >
      <div
        class="absolute bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[160px] text-sm"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @mousedown.stop
      >
        <button
          v-for="item in contextMenu.btn.rightClickMenu"
          :key="item.label"
          type="button"
          class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer"
          @click="handleContextMenuItem(item.onClick)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
