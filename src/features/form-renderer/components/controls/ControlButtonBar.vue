<script setup lang="ts">
import { ref } from 'vue'
import type { Button } from '../../types/schema'
import { evaluateEnable } from '../../composables/useDisabled'

const props = defineProps<{
  buttons: Button[]
  state?: Record<string, any>
  // Id of the button whose action is currently in-flight (set by the parent). That button shows a
  // spinner and is disabled until the API call resolves.
  activeActionId?: string | null
}>()
const emit = defineEmits<{ action: [id: string, handler: string, payload?: unknown] }>()

function isButtonEnabled(btn: Button): boolean {
  return evaluateEnable(btn.enable, props.state ?? {})
}

function isButtonLoading(btn: Button): boolean {
  return props.activeActionId === btn.id
}

// A button either names a frontend handler (onClick) or is a plain REST button (verb + action URL).
// REST buttons are routed through the generic dm_shared_runAction handler, which hits the action URL.
function onButtonClick(btn: Button) {
  if (btn.onClick) emit('action', btn.id, btn.onClick)
  else if (btn.action) emit('action', btn.id, 'dm_shared_runAction', { verb: btn.verb, action: btn.action, title: btn.title })
}

// Tooltip state
const tooltip = ref<{ text: string; x: number; y: number } | null>(null)

function showTooltip(event: MouseEvent, btn: Button) {
  if (!btn.tooltip) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tooltip.value = {
    text: btn.tooltip,
    x: rect.left,
    y: rect.bottom + 6,
  }
}

function hideTooltip() {
  tooltip.value = null
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
    <button
      v-for="btn in buttons"
      :key="btn.id"
      type="button"
      class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 transition flex items-center gap-2"
      :class="isButtonLoading(btn)
        ? 'cursor-wait opacity-80'
        : isButtonEnabled(btn)
          ? 'cursor-pointer hover:bg-gray-50'
          : 'opacity-50 cursor-not-allowed pointer-events-none'"
      :disabled="!isButtonEnabled(btn) || isButtonLoading(btn)"
      @click="onButtonClick(btn)"
      @contextmenu="onRightClick($event, btn)"
      @mouseenter="showTooltip($event, btn)"
      @mouseleave="hideTooltip"
    >
      <svg
        v-if="isButtonLoading(btn)"
        class="animate-spin w-4 h-4 text-xp-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {{ btn.title }}
    </button>
  </div>

  <!-- Tooltip (teleported to avoid overflow clipping) -->
  <Teleport to="body">
    <div
      v-if="tooltip"
      class="fixed z-[70] w-64 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg pointer-events-none"
      :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
    >
      <div class="absolute bottom-full left-4 border-4 border-transparent border-b-gray-800" />
      {{ tooltip.text }}
    </div>
  </Teleport>

  <!-- Context menu (teleported to body to avoid overflow clipping) -->
  <Teleport to="body">
    <div
      v-if="contextMenu"
      class="fixed inset-0 z-[60]"
      @mousedown="closeContextMenu"
    >
      <div
        class="absolute bg-white border border-gray-200 rounded shadow-xp py-1 min-w-[160px] text-sm"
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
