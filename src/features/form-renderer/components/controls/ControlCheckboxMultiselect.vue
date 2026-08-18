<script setup lang="ts">
/**
 * ControlCheckboxMultiselect
 *
 * A checkbox multi-select whose OPTIONS come from form state (populated by an action/button, not
 * fetched on mount) and whose VALUE is a comma-separated string of the selected option ids.
 *
 * Generic and NOT tied to any Data Manager:
 * - `optionsKey` names the form-state key holding the option list (a JSON string or array of
 *   `{ id, name }`). Some action writes it — e.g. after fetching a list from the external system —
 *   and this control renders it. Which key, and the action that fills it, are declared per form in
 *   the schema, so the same control works for any DM.
 * - Any currently-selected id not present in the options is still shown, so a saved selection stays
 *   visible before the option list is (re)loaded.
 */
import { computed, ref, onMounted } from 'vue'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

interface Option { id: string; name: string }

const props = defineProps<{
  title?:      string
  modelValue:  string        // comma-separated selected ids
  optionsKey?: string        // form-state key holding the [{ id, name }] option list
  loadFrom?:   string        // optional URL to auto-load the option list on mount (like the WinForm's list)
  guid?:       string
  serviceBase?: string
  state?:      Record<string, any>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const selectedIds = computed<string[]>(() =>
  (props.modelValue ?? '').split(',').map((s) => s.trim()).filter(Boolean),
)

// Options fetched once on mount from `loadFrom` (mirrors the WinForm showing the current list on open).
// A subsequent live refresh via the "Update Panel List" button writes `optionsKey` and takes precedence.
const fetchedOptions = ref<Option[]>([])
const loadErr        = ref('')

onMounted(async () => {
  const url = resolveLoadFromUrl(props.loadFrom, props.serviceBase ?? '', props.guid)
  if (!url) return
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
  }
})

const options = computed<Option[]>(() => {
  let provided: Option[] = []
  const raw = props.optionsKey ? props.state?.[props.optionsKey] : undefined
  if (typeof raw === 'string' && raw) {
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) provided = parsed } catch { /* ignore */ }
  } else if (Array.isArray(raw)) {
    provided = raw
  }
  // Merge by id: mount-fetched list first, then the button-provided list (a live refresh wins), then any
  // saved-but-not-listed ids so a selection is never silently dropped.
  const byId = new Map<string, Option>()
  for (const o of fetchedOptions.value) byId.set(String(o.id), { id: String(o.id), name: o.name })
  for (const o of provided)             byId.set(String(o.id), { id: String(o.id), name: o.name })
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
  emit('update:modelValue', [...next].join(','))
}
function selectAll() { emit('update:modelValue', options.value.map((o) => o.id).join(',')) }
function clearAll()  { emit('update:modelValue', '') }
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>

    <div class="flex gap-2">
      <button type="button" class="text-xs text-xp-primary hover:underline cursor-pointer" @click="selectAll">Select All</button>
      <span class="text-xs text-gray-300">|</span>
      <button type="button" class="text-xs text-xp-primary hover:underline cursor-pointer" @click="clearAll">Clear All</button>
    </div>

    <div class="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
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
</template>
