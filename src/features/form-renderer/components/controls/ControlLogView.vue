<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useCentrifugo } from '../../composables/useCentrifugo'
import type { DmLogEntry } from '../../composables/useCentrifugo'

const props = withDefaults(defineProps<{
  guid?:        string
  serviceBase?: string
  heightClass?: string   // panel height when not fullscreen (default h-80)
}>(), { heightClass: 'h-80' })

const logs       = ref<DmLogEntry[]>([])
const logEl      = ref<HTMLDivElement | null>(null)
const autoScroll = ref(true)
const fullscreen = ref(false)
// Minimized: the log body is hidden and only a single compact row remains at the bottom, restorable to
// its original height with the expand button.
const collapsed  = ref(false)
// True while the log lives in its own pop-out window — the in-page panel is then hidden so the log is
// shown EXCLUSIVELY in the new window (not duplicated here).
const poppedOut  = ref(false)

let stopStream: (() => void) | null = null
let popWatch: ReturnType<typeof setInterval> | null = null

function scrollToBottom() {
  if (autoScroll.value) nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight })
}

onMounted(() => {
  const { subscribe } = useCentrifugo()
  stopStream = subscribe(props.guid, entry => {
    logs.value.push(entry)
    scrollToBottom()
    appendToWindow(entry)   // mirror the live line into the pop-out window if it's open
  })
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  stopStream?.()
  window.removeEventListener('keydown', onKeydown)
  if (popWatch) { clearInterval(popWatch); popWatch = null }
  if (logWindow.value && !logWindow.value.closed) logWindow.value.close()
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) fullscreen.value = false
}

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
  scrollToBottom()
}

function clearLogs() {
  logs.value = []
  const c = logWindow.value && !logWindow.value.closed ? logWindow.value.document.getElementById('logs') : null
  if (c) c.innerHTML = ''
}

// error | warning | info — shared by the in-page coloring and the pop-out window coloring.
function levelKind(entry: DmLogEntry): 'error' | 'warning' | 'info' {
  const level = (entry.level ?? '').toUpperCase()
  const type  = (entry.type  ?? '').toUpperCase()
  if (level === 'ERROR'   || type === 'ERROR')   return 'error'
  if (level === 'WARNING' || type === 'WARNING' || level === 'WARN' || type === 'WARN') return 'warning'
  return 'info'
}

function lineClass(entry: DmLogEntry): string {
  return { error: 'text-red-400', warning: 'text-yellow-400', info: 'text-green-400' }[levelKind(entry)]
}

// ─── Pop-out window (opens the live log in a separate browser window) ─────────────
// The parent keeps the single Centrifugo subscription; each new entry is mirrored into the pop-out's
// DOM, so no second subscription is needed. Same-origin blank window — nothing is published anywhere.
const LINE_HEX = { error: '#f87171', warning: '#facc15', info: '#4ade80' } as const
const logWindow = ref<Window | null>(null)

function formatLine(entry: DmLogEntry): string {
  return `[${entry.timestamp}] [${entry.type}] ${entry.message}`
}

function appendToWindow(entry: DmLogEntry) {
  const w = logWindow.value
  if (!w || w.closed) return
  const container = w.document.getElementById('logs')
  if (!container) return
  const div = w.document.createElement('div')
  div.style.color = LINE_HEX[levelKind(entry)]
  div.textContent = formatLine(entry)
  container.appendChild(div)
  // The pop-out has its own Auto-scroll checkbox (falls back to the in-page one before it exists).
  const auto = (w.document.getElementById('autoscroll') as HTMLInputElement | null)?.checked ?? autoScroll.value
  if (auto) container.scrollTop = container.scrollHeight
}

// The pop-out mirrors the in-page panel: an "Auto-scroll / Clear" header over a dark, rounded log box.
const POPOUT_HTML =
  '<div style="display:flex;flex-direction:column;height:100vh;box-sizing:border-box;padding:8px 12px;background:#fff;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">' +
    '<div style="display:flex;align-items:center;gap:12px;padding:4px 2px;font-size:12px;color:#9ca3af">' +
      '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none">' +
        '<input id="autoscroll" type="checkbox" checked style="cursor:pointer"> Auto-scroll' +
      '</label>' +
      '<button id="clear" type="button" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:12px;padding:0">Clear</button>' +
    '</div>' +
    '<div id="logs" style="flex:1;overflow:auto;background:#030712;border:1px solid #e5e7eb;border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.6;padding:12px;margin-top:4px"></div>' +
  '</div>'

function openLogWindow() {
  // Focus an already-open pop-out instead of opening a second one.
  if (logWindow.value && !logWindow.value.closed) { logWindow.value.focus(); return }
  const w = window.open('', `dm-log-${props.guid ?? 'default'}`, 'width=960,height=560')
  if (!w) return   // popup blocked by the browser
  w.document.title = 'Sync Log'
  w.document.body.style.margin = '0'
  w.document.body.innerHTML = POPOUT_HTML
  w.document.getElementById('clear')?.addEventListener('click', clearLogs)
  logWindow.value = w
  poppedOut.value = true
  logs.value.forEach(appendToWindow)   // backfill the current buffer

  // Watch for the pop-out being closed (there's no reliable cross-browser close event) so the in-page
  // panel comes back automatically.
  if (popWatch) clearInterval(popWatch)
  popWatch = setInterval(() => {
    if (!logWindow.value || logWindow.value.closed) {
      poppedOut.value = false
      logWindow.value = null
      if (popWatch) { clearInterval(popWatch); popWatch = null }
      scrollToBottom()
    }
  }, 500)
}

function focusLogWindow() {
  if (logWindow.value && !logWindow.value.closed) logWindow.value.focus()
}
</script>

<template>
  <!-- Normal: fixed-height panel. Fullscreen: a full-page overlay (F11-like) covering the whole page. -->
  <div
    class="flex flex-col gap-1"
    :class="fullscreen ? 'fixed inset-0 z-[90] bg-white p-4' : (collapsed ? '' : props.heightClass)"
  >
    <!-- Minimized: a single compact row with a restore (expand) button. -->
    <div v-if="collapsed && !fullscreen" class="flex items-center gap-2 py-1">
      <span class="text-xs text-gray-400">Sync log</span>
      <button
        type="button"
        class="ml-auto flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition"
        title="Show log"
        @click="collapsed = false"
      >
        <!-- chevron up (expand) -->
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>

    <template v-else>
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

      <!-- Right-aligned tool buttons: [minimize] [maximize] [open in new window] -->
      <div class="ml-auto flex items-center gap-1">
        <!-- Minimize: collapse the log to a single row (restore with the expand button). -->
        <button
          v-if="!fullscreen"
          type="button"
          class="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition"
          title="Minimize logs"
          @click="collapsed = true"
        >
          <!-- chevron down (collapse) -->
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Maximize / fullscreen toggle (icon: expand corners; minimize when active) -->
        <button
          type="button"
          class="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition"
          :title="fullscreen ? 'Exit fullscreen (Esc)' : 'Maximize logs'"
          @click="toggleFullscreen"
        >
          <!-- expand corners (enter fullscreen) -->
          <svg v-if="!fullscreen" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
          </svg>
          <!-- minimize (arrows in) -->
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9L4 4m0 0v4m0-4h4M15 9l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m6-4l5 5m0 0v-4m0 4h-4" />
          </svg>
        </button>

        <!-- Open the log in a separate browser window (icon: arrow out of a box) — the existing button -->
        <button
          v-if="!fullscreen"
          type="button"
          class="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition"
          title="Open logs in a new window"
          @click="openLogWindow"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 4h6m0 0v6m0-6L13 11" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 15v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Popped out: the log lives exclusively in the separate window; show a placeholder here instead. -->
    <div
      v-if="poppedOut"
      class="flex-1 w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500"
    >
      <span>Log opened in a separate window.</span>
      <button
        type="button"
        class="text-xs text-xp-primary hover:underline cursor-pointer"
        @click="focusLogWindow"
      >Bring window to front</button>
    </div>

    <div
      v-else
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
    </template>
  </div>
</template>
