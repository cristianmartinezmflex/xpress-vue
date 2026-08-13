<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { KeyValuePair } from '../../types/schema'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

// Maps an external system field -> an XPressEntry field. Replaces the old generic "keyvalue" control.
// - Source Columns:      loaded from `loadFrom`            (the DM's external fields)
// - Destination Columns: loaded from `destinationLoadFrom` (local XPressEntry fields)
// When a load URL isn't provided (or the endpoint isn't available yet for that DM), the corresponding
// picker falls back to a free-text input, preserving the old behavior. The value round-trips as the
// same KeyValuePair[] the service already expects (key = source field, value = XPressEntry field).
const props = defineProps<{
  title?:               string
  keyHeader?:           string
  valueHeader?:         string
  keyTitle?:            string
  valueTitle?:          string
  loadFrom?:            string
  destinationLoadFrom?: string
  guid?:                string
  serviceBase?:         string
  modelValue:           KeyValuePair[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: KeyValuePair[]] }>()

const sourceOptions = ref<string[]>([])
const destOptions   = ref<string[]>([])
const selSource     = ref('')
const selDest       = ref('')
const loadErr       = ref('')

const rows = computed<KeyValuePair[]>(() => props.modelValue ?? [])

// Sources already mapped are hidden from the picker (a source maps to one destination).
const availableSources = computed(() =>
  sourceOptions.value.filter((s) => !rows.value.some((r) => r.key === s)),
)

async function loadInto(url: string | null, target: typeof sourceOptions) {
  if (!url) return
  try {
    const res = await fetch(url)
    if (!res.ok) { loadErr.value = `Error ${res.status}`; return }
    const data = await res.json()
    // Both endpoints return a string[] of field names; tolerate [{id,name}] just in case.
    target.value = Array.isArray(data)
      ? data.map((d: any) => (typeof d === 'string' ? d : (d?.name ?? d?.id ?? ''))).filter(Boolean)
      : []
  } catch {
    loadErr.value = 'Could not load'
  }
}

onMounted(() => {
  loadInto(resolveLoadFromUrl(props.loadFrom, props.serviceBase ?? '', props.guid), sourceOptions)
  loadInto(resolveLoadFromUrl(props.destinationLoadFrom, props.serviceBase ?? '', props.guid), destOptions)
})

function addMapping() {
  const k = selSource.value.trim()
  const v = selDest.value.trim()
  if (!k || !v) return
  if (rows.value.some((r) => r.key === k)) return   // one destination per source
  emit('update:modelValue', [...rows.value, { key: k, value: v }])
  selSource.value = ''
  selDest.value   = ''
}

function removeRow(index: number) {
  emit('update:modelValue', rows.value.filter((_, i) => i !== index))
}

const canAdd = computed(() => selSource.value.trim() !== '' && selDest.value.trim() !== '')
</script>

<template>
  <div class="flex flex-col gap-3">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>

    <!-- Pickers: Source Columns + Destination Columns + add -->
    <div class="flex gap-3 items-end">
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">{{ keyTitle ?? 'Source Columns' }}</label>
        <select
          v-if="sourceOptions.length"
          v-model="selSource"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
        >
          <option value=""></option>
          <option v-for="s in availableSources" :key="s" :value="s">{{ s }}</option>
        </select>
        <input
          v-else
          v-model="selSource"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
          placeholder="Source field"
        />
      </div>

      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">{{ valueTitle ?? 'Destination Columns' }}</label>
        <select
          v-if="destOptions.length"
          v-model="selDest"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
        >
          <option value=""></option>
          <option v-for="d in destOptions" :key="d" :value="d">{{ d }}</option>
        </select>
        <input
          v-else
          v-model="selDest"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
          placeholder="XPressEntry field"
        />
      </div>

      <button
        type="button"
        class="flex items-center justify-center w-9 h-9 rounded-full text-white font-bold transition self-end leading-none"
        :class="canAdd ? 'bg-xp-success hover:bg-xp-success-hover cursor-pointer' : 'bg-green-300 cursor-not-allowed'"
        style="font-size: 22px; padding-bottom: 1px;"
        :title="canAdd ? 'Add mapping' : 'Pick a source and a destination first'"
        :disabled="!canAdd"
        @click="addMapping"
      >+</button>
    </div>

    <p v-if="loadErr" class="text-xs text-xp-orange">{{ loadErr }} — you can still type the fields manually</p>

    <!-- Mapping grid -->
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-3 py-2 font-medium text-gray-600">{{ keyHeader ?? 'Source Field' }}</th>
            <th class="text-left px-3 py-2 font-medium text-gray-600">{{ valueHeader ?? 'XPressEntry Field' }}</th>
            <th class="w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows"
            :key="idx"
            class="border-b border-gray-100 last:border-0"
          >
            <td class="px-3 py-2">{{ row.key }}</td>
            <td class="px-3 py-2">{{ row.value }}</td>
            <td class="px-3 py-2 text-center">
              <button
                type="button"
                class="text-xp-red hover:text-xp-red-hover text-xs"
                @click="removeRow(idx)"
              >✕</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="3" class="px-3 py-4 text-center text-gray-400 text-sm">No field mappings</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
