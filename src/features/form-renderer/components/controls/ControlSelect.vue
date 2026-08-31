<script setup lang="ts">
/**
 * ControlSelect — single-choice dropdown. Unifies static and dynamic options (the old select +
 * select_dynamic):
 *
 *  - STATIC: pass `options` ([{ id, name }], known at schema time).
 *  - DYNAMIC: pass `dynOptions` (a source key, e.g. "users" → dm-data?type=users, "shared/zones" →
 *    /api/shared/zones) OR a legacy full-URL `loadFrom`. When either is present the list is fetched from
 *    the API on mount (blank "unset" option first, spinner while loading).
 *
 * Any saved id not present in the loaded options is still shown, so a selection is never dropped.
 */
import { ref, computed, onMounted } from 'vue'
import type { SelectOption } from '../../types/schema'
import { resolveLoadFromUrl } from '../../utils/loadFrom'
import { truncateLabel } from '../../utils/text'

const props = defineProps<{
  title?:       string
  modelValue:   string | number
  options?:     SelectOption[]   // static options
  dynOptions?:  string           // dynamic source key (preferred)
  loadFrom?:    string           // legacy dynamic source (full URL / short form) — static JSON schemas
  guid?:        string
  serviceBase?: string
  error?:       string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

// Dynamic when a source is declared; otherwise the static `options` list.
const source = computed(() => props.dynOptions || props.loadFrom || '')
const isDynamic = computed(() => source.value.length > 0)

const fetched = ref<SelectOption[]>([])
const loading = ref(false)
const fetchErr = ref('')

onMounted(async () => {
  if (!isDynamic.value) return
  const url = resolveLoadFromUrl(source.value, props.serviceBase ?? '', props.guid)
  if (!url) return
  loading.value = true
  try {
    const res = await fetch(url)
    if (!res.ok) { fetchErr.value = `Error ${res.status}`; return }
    const data = await res.json()
    fetched.value = Array.isArray(data)
      ? data.map((o: any) => ({ id: o?.id ?? '', name: String(o?.name ?? o?.id ?? '') })).filter((o) => o.id !== '')
      : []
  } catch {
    fetchErr.value = 'Could not load'
  } finally {
    loading.value = false
  }
})

const options = computed<SelectOption[]>(() => (isDynamic.value ? fetched.value : (props.options ?? [])))

// Coerce numeric ids to numbers (dynamic ids are usually numeric) so the saved value matches the option
// type; leave the blank/unset and non-numeric values as-is.
function onChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  const num = Number(raw)
  emit('update:modelValue', raw === '' || isNaN(num) ? raw : num)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</label>
    <div class="relative">
      <select
        :value="modelValue"
        class="w-full max-w-full truncate rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
        :class="[{ 'border-xp-red': error }, loading ? 'pr-9 text-gray-400' : '']"
        :disabled="loading"
        @change="onChange"
      >
        <!-- Dynamic: a blank "unset" option first (mirrors the WinForm's empty combo). -->
        <option v-if="isDynamic" :value="-1"></option>
        <option v-if="loading" value="" disabled>Loading…</option>
        <option v-for="opt in options" :key="opt.id" :value="opt.id" :title="opt.name">{{ truncateLabel(opt.name) }}</option>
      </select>
      <svg
        v-if="loading"
        class="animate-spin w-4 h-4 text-xp-primary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
    <p v-if="fetchErr" class="text-xs text-xp-orange">{{ fetchErr }} — enter ID manually</p>
    <p v-if="error" class="text-xs text-xp-red">{{ error }}</p>
  </div>
</template>
