<script setup lang="ts">
/**
 * ControlMultiselect — a checkbox multi-select. Unifies static and dynamic options (like Select):
 *
 *  - STATIC: pass `options` ([{ id, name }]).
 *  - DYNAMIC: pass `dynOptions` (a source key, "users"/"shared/zones") OR a legacy full-URL `loadFrom`;
 *    the list is fetched from the API on mount.
 *
 * VALUE is a separator-joined string of the selected option ids (default separator ","). Generic and
 * NOT tied to any Data Manager. Any selected id not present in the option list is still shown, so a
 * saved selection is never silently dropped.
 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { SelectOption } from '../../types/schema'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

interface Option { id: string; name: string }

const props = defineProps<{
  title?:      string
  modelValue:  string           // separator-joined selected ids
  options?:    SelectOption[]    // static options (schema-declared)
  dynOptions?: string           // dynamic source key (preferred)
  loadFrom?:   string           // legacy dynamic source (full URL / short form) — static JSON schemas
  guid?:       string
  serviceBase?: string
  separator?:  string           // token joining the selected ids (default ","; e.g. "\b"/vbBack for AEOS)
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const sep = computed(() => props.separator || ',')

const selectedIds = computed<string[]>(() =>
  (props.modelValue ?? '').split(sep.value).map((s) => s.trim()).filter(Boolean),
)

// Options fetched from the API (when a dynamic source is declared). Falls back to the static `options`.
const fetchedOptions = ref<Option[] | null>(null)
const loadErr        = ref('')
const loading        = ref(false)

async function loadOptions() {
  const source = props.dynOptions || props.loadFrom
  const url = resolveLoadFromUrl(source, props.serviceBase ?? '', props.guid)
  if (!url) return
  loading.value = true
  try {
    const res = await fetch(url)
    if (!res.ok) { loadErr.value = `Error ${res.status}`; return }
    const data = await res.json()
    fetchedOptions.value = Array.isArray(data)
      ? data.map((o: any) => ({ id: String(o?.id ?? ''), name: String(o?.name ?? o?.id ?? '') })).filter((o) => o.id)
      : []
    loadErr.value = ''
  } catch {
    loadErr.value = 'Could not load'
  } finally {
    loading.value = false
  }
}

// A DM action that mutates server data (e.g. Genetec "Sync Doors" importing doors into XPressEntry)
// fires "dm:data-changed" on success — re-fetch so the list reflects the new data without a reload.
function onDataChanged() { if (props.dynOptions || props.loadFrom) loadOptions() }

onMounted(() => {
  loadOptions()
  window.addEventListener('dm:data-changed', onDataChanged)
})
onBeforeUnmount(() => window.removeEventListener('dm:data-changed', onDataChanged))

const options = computed<Option[]>(() => {
  const src = fetchedOptions.value ?? (props.options ?? []).map((o) => ({ id: String(o.id), name: o.name }))
  const byId = new Map<string, Option>()
  for (const o of src) byId.set(o.id, o)
  // Keep any saved-but-not-listed ids visible so a selection is never silently dropped.
  for (const id of selectedIds.value) if (!byId.has(id)) byId.set(id, { id, name: id })
  const arr = [...byId.values()]
  // Dynamic data lists are sorted alphabetically (WinForm parity); pure-static lists keep declared order.
  if (props.dynOptions || props.loadFrom) arr.sort((a, b) => a.name.localeCompare(b.name))
  return arr
})

function isChecked(id: string): boolean {
  return selectedIds.value.includes(id)
}
function toggle(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else              next.add(id)
  emit('update:modelValue', [...next].join(sep.value))
}
function selectAll() { emit('update:modelValue', options.value.map((o) => o.id).join(sep.value)) }
function clearAll()  { emit('update:modelValue', '') }

// ─── Inline filter (replaces the old "…" button + modal): a "Type to filter…" box that narrows the
// list in place. The value stays the full selection; filtering only affects what's shown.
const query = ref('')

const filteredOptions = computed<Option[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return options.value
  return options.value.filter((o) => o.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>

    <div class="flex items-center gap-2">
      <button type="button" class="text-xs text-xp-primary hover:underline cursor-pointer" @click="selectAll">Select All</button>
      <span class="text-xs text-gray-300">|</span>
      <button type="button" class="text-xs text-xp-primary hover:underline cursor-pointer" @click="clearAll">Clear All</button>
      <!-- Inline filter (replaces the old "…" search modal): narrows the list in place. -->
      <input
        v-model="query"
        type="text"
        placeholder="Type to filter…"
        class="ml-auto w-48 border-0 border-b-2 border-xp-primary focus:outline-none text-sm py-1.5 bg-transparent"
      />
    </div>

    <!-- While the option list is being fetched from the API, show a spinner instead of the empty box. -->
    <div
      v-if="loading"
      class="border border-gray-200 rounded-lg px-3 py-4 flex items-center justify-center gap-2 text-sm text-gray-400"
    >
      <svg class="animate-spin w-4 h-4 text-xp-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Loading…
    </div>

    <div v-else class="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
      <label
        v-for="o in filteredOptions"
        :key="o.id"
        class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
      >
        <input
          type="checkbox"
          :checked="isChecked(o.id)"
          class="w-4 h-4 rounded accent-xp-primary"
          @change="toggle(o.id)"
        />
        <span class="text-sm text-gray-800">{{ o.name }}</span>
      </label>
      <div v-if="options.length === 0" class="px-3 py-4 text-center text-gray-400 text-sm">
        No options loaded yet.
      </div>
      <div v-else-if="filteredOptions.length === 0" class="px-3 py-4 text-center text-gray-400 text-sm">
        No items match “{{ query }}”.
      </div>
    </div>

    <p v-if="loadErr" class="text-xs text-xp-orange">{{ loadErr }} — click “Update Panel List” to load from the system</p>
    <p class="text-xs text-gray-400">
      {{ selectedIds.length }} selected<span v-if="query.trim()"> · {{ filteredOptions.length }} of {{ options.length }} shown</span>
    </p>
  </div>
</template>
