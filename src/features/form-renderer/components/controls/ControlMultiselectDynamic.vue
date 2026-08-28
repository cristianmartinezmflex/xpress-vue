<script setup lang="ts">
/**
 * ControlMultiselectDynamic
 *
 * A checkbox multi-select whose OPTIONS are auto-loaded from the API on mount (`loadFrom` →
 * `[{ id, name }]`) and whose VALUE is a separator-joined string of the selected option ids.
 *
 * Generic and NOT tied to any Data Manager. Any currently-selected id not present in the loaded
 * options is still shown, so a saved selection stays visible before/without the option list.
 */
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

interface Option { id: string; name: string }

const props = defineProps<{
  title?:      string
  modelValue:  string        // separator-joined selected ids
  loadFrom?:   string        // URL to auto-load the option list on mount (like the WinForm's list)
  guid?:       string
  serviceBase?: string
  separator?:  string        // token joining the selected ids (default ","; e.g. "\b"/vbBack for AEOS)
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const sep = computed(() => props.separator || ',')

const selectedIds = computed<string[]>(() =>
  (props.modelValue ?? '').split(sep.value).map((s) => s.trim()).filter(Boolean),
)

// Options fetched once on mount from `loadFrom` (mirrors the WinForm showing the current list on open).
const fetchedOptions = ref<Option[]>([])
const loadErr        = ref('')
const loading        = ref(false)

onMounted(async () => {
  const url = resolveLoadFromUrl(props.loadFrom, props.serviceBase ?? '', props.guid)
  if (!url) return
  loading.value = true
  try {
    const res = await fetch(url)
    if (!res.ok) { loadErr.value = `Error ${res.status}`; return }
    const data = await res.json()
    if (Array.isArray(data)) {
      fetchedOptions.value = data
        .map((o: any) => ({ id: String(o?.id ?? ''), name: String(o?.name ?? o?.id ?? '') }))
        .filter((o) => o.id)
    }
  } catch {
    loadErr.value = 'Could not load'
  } finally {
    loading.value = false
  }
})

const options = computed<Option[]>(() => {
  // Loaded list first, then any saved-but-not-listed ids so a selection is never silently dropped.
  const byId = new Map<string, Option>()
  for (const o of fetchedOptions.value) byId.set(String(o.id), { id: String(o.id), name: o.name })
  for (const id of selectedIds.value)   if (!byId.has(id)) byId.set(id, { id, name: id })
  return [...byId.values()]
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

// ─── Search dialog (the WinForm's "..." button → "Search Panels" popup) ──────────
// A modal with a "Type to filter…" box and an "N of M items" counter, checking items in place.
const searchOpen  = ref(false)
const query       = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

const filteredOptions = computed<Option[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return options.value
  return options.value.filter((o) => o.name.toLowerCase().includes(q))
})

async function openSearch() {
  query.value = ''
  searchOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}
function closeSearch() { searchOpen.value = false }

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && searchOpen.value) closeSearch()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>

    <div class="flex items-center gap-2">
      <button type="button" class="text-xs text-xp-primary hover:underline cursor-pointer" @click="selectAll">Select All</button>
      <span class="text-xs text-gray-300">|</span>
      <button type="button" class="text-xs text-xp-primary hover:underline cursor-pointer" @click="clearAll">Clear All</button>
      <!-- "…" opens the search dialog (WinForm parity) -->
      <button
        type="button"
        class="ml-auto flex items-center justify-center w-7 h-7 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 cursor-pointer"
        title="Search"
        @click="openSearch"
      >
        <span class="text-base leading-none -mt-1">…</span>
      </button>
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
        v-for="o in options"
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
    </div>

    <p v-if="loadErr" class="text-xs text-xp-orange">{{ loadErr }} — click “Update Panel List” to load from the system</p>
    <p class="text-xs text-gray-400">{{ selectedIds.length }} selected</p>
  </div>

  <!-- Search dialog: filter box + checkbox list, toggling selections in place (WinForm "Search" popup). -->
  <Teleport to="body">
    <div v-if="searchOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" @mousedown.self="closeSearch">
      <div class="w-[440px] max-w-[92vw] max-h-[85vh] rounded-xl bg-white shadow-xl flex flex-col">
        <div class="flex items-center justify-between px-5 pt-4">
          <h3 class="text-base font-semibold text-gray-800">Search{{ title ? ' ' + title : '' }}</h3>
          <button type="button" class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer" title="Close" @click="closeSearch">✕</button>
        </div>

        <div class="px-5 pt-3">
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            placeholder="Type to filter…"
            class="w-full border-0 border-b-2 border-xp-primary focus:outline-none text-sm py-1.5 bg-transparent"
          />
          <p class="text-xs text-gray-400 mt-2">{{ filteredOptions.length }} of {{ options.length }} items</p>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-3 mt-1">
          <label
            v-for="o in filteredOptions"
            :key="o.id"
            class="flex items-center gap-3 px-1 py-1.5 hover:bg-gray-50 cursor-pointer rounded"
          >
            <input type="checkbox" :checked="isChecked(o.id)" class="w-4 h-4 rounded accent-xp-primary" @change="toggle(o.id)" />
            <span class="text-sm text-gray-800">{{ o.name }}</span>
          </label>
          <div v-if="filteredOptions.length === 0" class="px-1 py-6 text-center text-gray-400 text-sm">
            No items match “{{ query }}”.
          </div>
        </div>

        <div class="flex justify-end px-5 py-3 border-t border-gray-100">
          <button type="button" class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer" @click="closeSearch">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
