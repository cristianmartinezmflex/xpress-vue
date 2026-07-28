<script setup lang="ts">
/**
 * ControlSocketInterfaces
 *
 * Renders the AEOS "socket_interface_settings" field.
 * The value is a vbBack-separated string of XML-serialized SocketInterfaceModel objects.
 * We represent it in the UI as a list of rows with key fields.
 * On save the parent serializes state as-is (the string value) — so we manage
 * the raw XML string ourselves here via a parsed intermediate representation.
 *
 * SocketInterfaceModel fields match the current AEOS desktop client (ctlSocketInterface):
 *   AEPUIP, Port, AEPUName, Username, Password, Prefix, CardType
 */

import { ref, computed, onMounted } from 'vue'

interface SocketRow {
  AEPUIP:   string
  Port:     string
  AEPUName: string
  Username: string
  Password: string
  Prefix:   string
  CardType: string
}

interface DynamicOption { id: number | string; name: string }

const SEPARATOR = '\x08'

const props = defineProps<{
  title?:       string
  modelValue:   string   // vbBack-separated XML strings
  guid?:        string
  serviceBase?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// ─── Card Type options (shared across all rows) ───────────────────────────────

const cardTypeOptions = ref<DynamicOption[]>([])
const cardTypeError   = ref('')

onMounted(async () => {
  if (!props.guid || !props.serviceBase) return
  try {
    const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/aeos/badge-types`)
    if (!res.ok) { cardTypeError.value = `Error ${res.status}`; return }
    cardTypeOptions.value = await res.json()
  } catch {
    cardTypeError.value = 'Could not load'
  }
})

// ─── Parse XML string → SocketRow ────────────────────────────────────────────

function parseXml(xml: string): SocketRow | null {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null
    const get = (tag: string) => doc.querySelector(tag)?.textContent ?? ''
    return {
      AEPUIP:   get('AEPUIP'),
      Port:     get('Port'),
      AEPUName: get('AEPUName'),
      Username: get('Username'),
      Password: get('Password'),
      Prefix:   get('Prefix'),
      CardType: get('CardType'),
    }
  } catch {
    return null
  }
}

function rowToXml(row: SocketRow): string {
  return `<?xml version="1.0" encoding="utf-16"?>\n` +
    `<SocketInterfaceModel xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n` +
    `  <AEPUIP>${escXml(row.AEPUIP)}</AEPUIP>\n` +
    `  <Port>${escXml(row.Port)}</Port>\n` +
    `  <AEPUName>${escXml(row.AEPUName)}</AEPUName>\n` +
    `  <Username>${escXml(row.Username)}</Username>\n` +
    `  <Password>${escXml(row.Password)}</Password>\n` +
    `  <Prefix>${escXml(row.Prefix)}</Prefix>\n` +
    `  <CardType>${escXml(row.CardType)}</CardType>\n` +
    `</SocketInterfaceModel>`
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── State ────────────────────────────────────────────────────────────────────

const rows = computed<SocketRow[]>(() => {
  const val = props.modelValue ?? ''
  return val.split(SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseXml)
    .filter((r): r is SocketRow => r !== null)
})

function emitRows(next: SocketRow[]) {
  emit('update:modelValue', next.map(rowToXml).join(SEPARATOR))
}

function addRow() {
  emitRows([...rows.value, { AEPUIP: '', Port: '8035', AEPUName: '', Username: '', Password: '', Prefix: '', CardType: '' }])
}

function removeRow(idx: number) {
  emitRows(rows.value.filter((_, i) => i !== idx))
}

function updateField(idx: number, field: keyof SocketRow, val: string) {
  const next = rows.value.map((r, i) => i === idx ? { ...r, [field]: val } : r)
  emitRows(next)
}

const expanded = ref<Set<number>>(new Set())
function toggleExpand(idx: number) {
  const s = new Set(expanded.value)
  if (s.has(idx)) s.delete(idx)
  else             s.add(idx)
  expanded.value = s
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>
    <p class="text-xs text-gray-400">
      Click Card Type to see the prefix mappings for the identifier types, or find them in the access point descriptions manual.
    </p>

    <!-- Row list -->
    <div v-if="rows.length > 0" class="flex flex-col gap-2">
      <div
        v-for="(row, idx) in rows"
        :key="idx"
        class="border border-gray-200 rounded-lg overflow-hidden"
      >
        <!-- Header row -->
        <div
          class="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer select-none"
          @click="toggleExpand(idx)"
        >
          <svg
            class="w-4 h-4 text-gray-400 shrink-0 transition-transform"
            :class="expanded.has(idx) ? 'rotate-90' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span class="text-sm font-medium text-gray-700 flex-1">
            {{ row.AEPUName || row.AEPUIP || `Interface ${idx + 1}` }}
          </span>
          <span v-if="row.AEPUIP" class="text-xs text-gray-400">{{ row.AEPUIP }}:{{ row.Port }}</span>
          <button
            type="button"
            class="ml-2 text-xp-red hover:text-xp-red-hover text-xs px-2"
            @click.stop="removeRow(idx)"
          >✕</button>
        </div>

        <!-- Expanded fields -->
        <div v-if="expanded.has(idx)" class="p-3 grid grid-cols-2 gap-3 border-t border-gray-100">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">AEPU IP</label>
            <input :value="row.AEPUIP" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'AEPUIP', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Port</label>
            <input :value="row.Port" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'Port', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">AEPU Name</label>
            <input :value="row.AEPUName" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'AEPUName', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Username</label>
            <input :value="row.Username" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'Username', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Password</label>
            <input type="password" :value="row.Password" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'Password', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Prefix</label>
            <input :value="row.Prefix" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'Prefix', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Card Type</label>
            <select :value="row.CardType" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @change="updateField(idx, 'CardType', ($event.target as HTMLSelectElement).value)">
              <option value="">— Select —</option>
              <option v-for="opt in cardTypeOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
            </select>
            <p v-if="cardTypeError" class="text-xs text-xp-orange">{{ cardTypeError }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
      No socket interfaces configured
    </div>

    <!-- Add button -->
    <button
      type="button"
      class="flex items-center gap-2 text-sm text-xp-primary hover:text-xp-primary-hover font-medium cursor-pointer w-fit"
      @click="addRow"
    >
      <span class="text-lg leading-none">+</span> Add Socket Interface
    </button>
  </div>
</template>
