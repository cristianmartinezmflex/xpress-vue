<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useCentrifugo } from '../../composables/useCentrifugo'
import type { DmLogEntry } from '../../composables/useCentrifugo'

const props = defineProps<{
  guid?:        string
  serviceBase?: string
}>()

const logs       = ref<DmLogEntry[]>([])
const logEl      = ref<HTMLDivElement | null>(null)
const autoScroll = ref(true)
const fullscreen = ref(false)

let stopStream: (() => void) | null = null

function scrollToBottom() {
  if (autoScroll.value) nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight })
}

onMounted(() => {
  const { subscribe } = useCentrifugo()
  stopStream = subscribe(props.guid, entry => {
    logs.value.push(entry)
    scrollToBottom()
  })
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  stopStream?.()
  window.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) fullscreen.value = false
}

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
  scrollToBottom()
}

function clearLogs() { logs.value = [] }

function lineClass(entry: DmLogEntry): string {
  const level = (entry.level ?? '').toUpperCase()
  const type  = (entry.type  ?? '').toUpperCase()
  if (level === 'ERROR'   || type === 'ERROR')   return 'text-red-400'
  if (level === 'WARNING' || type === 'WARNING' || level === 'WARN' || type === 'WARN')
    return 'text-yellow-400'
  return 'text-green-400'
}
</script>

<template>
  <!-- Normal: fixed-height panel. Fullscreen: a full-page overlay (F11-like) covering the whole page. -->
  <div
    class="flex flex-col gap-1"
    :class="fullscreen ? 'fixed inset-0 z-[90] bg-white p-4' : 'h-80'"
  >
    <div class="flex items-center gap-3">
      <label class="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
        <input v-model="autoScroll" type="checkbox" class="cursor-pointer" />
        Auto-scroll
      </label>
      <button
        type="button"
        class="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition"
        @click="clearLogs"
      >
        Clear
      </button>

      <!-- Fullscreen toggle (top-right) -->
      <button
        type="button"
        class="ml-auto flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition"
        :title="fullscreen ? 'Exit fullscreen (Esc)' : 'Open logs fullscreen'"
        @click="toggleFullscreen"
      >
        <!-- expand (arrow out of a box) -->
        <svg v-if="!fullscreen" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14 4h6m0 0v6m0-6L13 11" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 15v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h3" />
        </svg>
        <!-- minimize (arrows in) -->
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 9L4 4m0 0v4m0-4h4M15 9l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m6-4l5 5m0 0v-4m0 4h-4" />
        </svg>
      </button>
    </div>

    <div
      ref="logEl"
      class="flex-1 w-full overflow-y-auto rounded-lg border border-gray-200 bg-gray-950 font-mono text-xs p-3 leading-relaxed"
    >
      <div
        v-for="(entry, i) in logs"
        :key="i"
        :class="lineClass(entry)"
      >
        [{{ entry.timestamp }}] [{{ entry.type }}] {{ entry.message }}
      </div>
    </div>
  </div>
</template>
