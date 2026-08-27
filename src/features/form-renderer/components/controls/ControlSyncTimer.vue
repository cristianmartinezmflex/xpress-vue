<script setup lang="ts">
/**
 * ControlSyncTimer — one sync-timer frequency row (mirrors the WinForm Sync Timers rows): a read-only
 * field showing the human-readable schedule, plus Set (opens the schedule editor) and Clear.
 *
 * modelValue is the RAW schedule/interval string owned by Telaeris.ScheduleTimer, persisted as-is in
 * the DM setting (e.g. dm_activity_sync_frequency). Format (entries joined by '|'):
 *   BySecond;N | ByMinute;N | Hourly;N | Daily;HH:mm:ss | Weekly;Day;HH:mm:ss | Monthly;DOM;HH:mm:ss
 *
 * The human-readable text and validation come from the backend (/api/schedule/readable), which uses
 * the real Telaeris.ScheduleTimer DLL — the same logic as the WinForm, so the text is byte-identical.
 */
import { ref, watch, computed } from 'vue'

interface Entry { freq: string; n: number; time: string; day: string; dom: number }

const FREQS = [
  { id: 'BySecond', label: 'By Second' },
  { id: 'ByMinute', label: 'By Minute' },
  { id: 'Hourly',   label: 'Hourly' },
  { id: 'Daily',    label: 'Daily' },
  { id: 'Weekly',   label: 'Weekly' },
  { id: 'Monthly',  label: 'Monthly' },
]
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const INTERVAL_FREQS = new Set(['BySecond', 'ByMinute', 'Hourly'])

const props = defineProps<{
  title?:       string
  modelValue:   string
  serviceBase?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// ─── Read-only display (human-readable via the DLL-backed endpoint) ───────────────
const readable = ref('')
async function refreshReadable(value: string) {
  if (!value) { readable.value = ''; return }
  if (!props.serviceBase) { readable.value = value; return }
  try {
    const res = await fetch(`${props.serviceBase}/api/schedule/readable?value=${encodeURIComponent(value)}`)
    if (!res.ok) { readable.value = value; return }
    const data = await res.json() as { readable?: string }
    readable.value = data.readable || value
  } catch {
    readable.value = value
  }
}
watch(() => props.modelValue, (v) => refreshReadable(v), { immediate: true })

function clear() {
  if (props.modelValue) emit('update:modelValue', '')
}

// ─── Editor modal ────────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const entries   = ref<Entry[]>([])
const preview   = ref('')

function newEntry(): Entry {
  return { freq: 'ByMinute', n: 5, time: '08:00', day: 'Monday', dom: 1 }
}

// Parse the raw interval string back into editable entries.
function parseRaw(raw: string): Entry[] {
  const out: Entry[] = []
  for (const part of (raw || '').split('|').map((s) => s.trim()).filter(Boolean)) {
    const t = part.split(';').map((s) => s.trim())
    const e = newEntry()
    e.freq = t[0]
    if (INTERVAL_FREQS.has(t[0])) {
      e.n = Number(t[1]) || 1
    } else if (t[0] === 'Daily') {
      e.time = toHHmm(t[1])
    } else if (t[0] === 'Weekly') {
      if (t.length >= 3) { e.day = t[1]; e.time = toHHmm(t[2]) } else { e.time = toHHmm(t[1]) }
    } else if (t[0] === 'Monthly') {
      if (t.length >= 3) { e.dom = Number(t[1]) || 1; e.time = toHHmm(t[2]) } else { e.time = toHHmm(t[1]) }
    }
    out.push(e)
  }
  return out
}

const toHHmm  = (s: string) => (s || '08:00:00').split(':').slice(0, 2).join(':')
const toHHmmss = (s: string) => (s.split(':').length === 2 ? `${s}:00` : s)

// Build the raw interval string for one entry, in the exact ScheduleTimer format.
function entryToRaw(e: Entry): string {
  if (INTERVAL_FREQS.has(e.freq)) return `${e.freq};${Math.max(1, Math.floor(e.n) || 1)}`
  if (e.freq === 'Daily')   return `Daily;${toHHmmss(e.time)}`
  if (e.freq === 'Weekly')  return `Weekly;${e.day};${toHHmmss(e.time)}`
  if (e.freq === 'Monthly') return `Monthly;${Math.min(31, Math.max(1, Math.floor(e.dom) || 1))};${toHHmmss(e.time)}`
  return ''
}

const draftRaw = computed(() => entries.value.map(entryToRaw).filter(Boolean).join('|'))

async function refreshPreview() {
  const raw = draftRaw.value
  if (!raw) { preview.value = ''; return }
  if (!props.serviceBase) { preview.value = raw; return }
  try {
    const res = await fetch(`${props.serviceBase}/api/schedule/readable?value=${encodeURIComponent(raw)}`)
    const data = res.ok ? await res.json() as { readable?: string } : null
    preview.value = data?.readable || '(invalid schedule)'
  } catch {
    preview.value = raw
  }
}
watch(draftRaw, refreshPreview)

function openEditor() {
  entries.value = props.modelValue ? parseRaw(props.modelValue) : [newEntry()]
  if (entries.value.length === 0) entries.value = [newEntry()]
  modalOpen.value = true
  refreshPreview()
}
function addEntry()      { entries.value = [...entries.value, newEntry()] }
function removeEntry(i: number) { entries.value = entries.value.filter((_, idx) => idx !== i) }
function cancel()        { modalOpen.value = false }
function save()          { emit('update:modelValue', draftRaw.value); modalOpen.value = false }
</script>

<template>
  <div class="flex items-center gap-3">
    <label class="text-sm text-xp-label text-right flex-1 min-w-0">{{ title }}</label>
    <input
      type="text"
      readonly
      :value="readable"
      placeholder="—"
      class="w-56 rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm text-gray-700 cursor-default focus:outline-none"
    />
    <button
      type="button"
      class="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
      @click="openEditor"
    >Set</button>
    <button
      type="button"
      class="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 transition"
      :class="modelValue ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'"
      :disabled="!modelValue"
      @click="clear"
    >Clear</button>
  </div>

  <!-- Schedule editor (teleported to body to escape section overflow) -->
  <Teleport to="body">
    <div v-if="modalOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" @mousedown.self="cancel">
      <div class="w-[540px] max-w-[92vw] max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl p-5 flex flex-col gap-4">
        <h3 class="text-base font-semibold text-gray-800">Schedule — {{ title }}</h3>

        <div class="flex flex-col gap-2">
          <div v-for="(e, i) in entries" :key="i" class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
            <select v-model="e.freq" class="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white">
              <option v-for="f in FREQS" :key="f.id" :value="f.id">{{ f.label }}</option>
            </select>

            <template v-if="INTERVAL_FREQS.has(e.freq)">
              <span class="text-sm text-gray-500">every</span>
              <input type="number" min="1" v-model.number="e.n" class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
            </template>
            <template v-else>
              <select v-if="e.freq === 'Weekly'" v-model="e.day" class="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white">
                <option v-for="d in DAYS" :key="d" :value="d">{{ d }}</option>
              </select>
              <template v-if="e.freq === 'Monthly'">
                <span class="text-sm text-gray-500">day</span>
                <input type="number" min="1" max="31" v-model.number="e.dom" class="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
              </template>
              <span class="text-sm text-gray-500">at</span>
              <input type="time" step="1" v-model="e.time" class="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
            </template>

            <button type="button" class="ml-auto text-xp-red hover:text-xp-red-hover text-sm px-2" @click="removeEntry(i)">✕</button>
          </div>
        </div>

        <button type="button" class="text-sm text-xp-primary hover:underline w-fit cursor-pointer" @click="addEntry">+ Add schedule</button>

        <div class="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <span class="font-semibold text-xp-label">Preview:</span> {{ preview || '—' }}
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer" @click="cancel">Cancel</button>
          <button type="button" class="px-4 py-2 text-sm rounded-lg border border-xp-primary bg-xp-primary text-white hover:bg-xp-primary-hover cursor-pointer" @click="save">Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
