<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { KeyValuePair } from '../../types/schema'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

// Maps an external system field -> an XPressEntry field. Mirrors the WinForm ctlCustomFields:
//   - Source Columns / Destination Columns are EDITABLE combos: pick from the loaded list OR type a
//     custom value (WinForm uses editable ComboBox.Text).
//   - The "+" button is ALWAYS enabled; clicking with either combo empty simply does nothing
//     (WinForm btnAddTable_Click: Exit Sub when either is blank).
//   - Duplicate source fields are not added.
// Source Columns  = loadFrom            (the DM's external fields)
// Destination Cols = destinationLoadFrom (local XPressEntry fields; the WinForm defaults these to the
//                    UserData fields, which is what /api/shared/entity-fields-users returns).
// Value round-trips as the same KeyValuePair[] the service expects (key = source, value = XPE field).
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

// Unique ids so multiple customFields controls on one page don't share <datalist>s.
let _uidCounter = 0
const uid = `cf-${Date.now().toString(36)}-${_uidCounter++}`

const sourceOptions = ref<string[]>([])
const destOptions   = ref<string[]>([])
const selSource     = ref('')
const selDest       = ref('')
const loadErr       = ref('')

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

// Always enabled (WinForm parity). No-op if either field is empty or the source is already mapped.
function addMapping() {
  const k = selSource.value.trim()
  const v = selDest.value.trim()
  if (!k || !v) return
  const rows = props.modelValue ?? []
  if (rows.some((r) => r.key === k)) return   // one destination per source
  emit('update:modelValue', [...rows, { key: k, value: v }])
  selSource.value = ''
  selDest.value   = ''
}

function removeRow(index: number) {
  emit('update:modelValue', (props.modelValue ?? []).filter((_, i) => i !== index))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>

    <!-- Editable combos (pick or type) + add — same as the WinForm -->
    <div class="flex gap-3 items-end">
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">{{ keyTitle ?? 'Source Columns' }}</label>
        <input
          v-model="selSource"
          :list="`${uid}-src`"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
          placeholder="Select or type a source field"
          @keydown.enter.prevent="addMapping"
        />
        <datalist :id="`${uid}-src`">
          <option v-for="s in sourceOptions" :key="s" :value="s" />
        </datalist>
      </div>

      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">{{ valueTitle ?? 'Destination Columns' }}</label>
        <input
          v-model="selDest"
          :list="`${uid}-dst`"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
          placeholder="Select or type an XPressEntry field"
          @keydown.enter.prevent="addMapping"
        />
        <datalist :id="`${uid}-dst`">
          <option v-for="d in destOptions" :key="d" :value="d" />
        </datalist>
      </div>

      <button
        type="button"
        class="flex items-center justify-center w-9 h-9 rounded-full text-white font-bold transition self-end leading-none bg-xp-success hover:bg-xp-success-hover cursor-pointer"
        style="font-size: 22px; padding-bottom: 1px;"
        title="Add mapping"
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
            v-for="(row, idx) in (modelValue ?? [])"
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
          <tr v-if="(modelValue ?? []).length === 0">
            <td colspan="3" class="px-3 py-4 text-center text-gray-400 text-sm">No field mappings</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
