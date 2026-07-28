<script setup lang="ts">
/**
 * ControlIpBadgeMappings
 *
 * Renders the AEOS "ip_badge_settings" field.
 * Value is a vbBack-separated string of XML-serialized IPBadgeInterfaceModel objects.
 *
 * IPBadgeInterfaceModel fields match the current AEOS desktop client (ctlIPBadgeSelection):
 *   Type, CardType, Door, ASCII, IPAddress, Port, Prefix, PadToLength
 */

import { ref, computed, onMounted } from 'vue'

interface IPBadgeRow {
  Type:       string
  CardType:   string
  Door:       string
  ASCII:      boolean
  IPAddress:  string
  Port:       string
  Prefix:     string
  PadToLength: string
}

interface DynamicOption { id: number | string; name: string }

const SEPARATOR = '\x08'
const TYPE_OPTIONS = ['ENTRY', 'EXIT']

const props = defineProps<{
  title?:       string
  modelValue:   string
  guid?:        string
  serviceBase?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// ─── Card Type / Door options (shared across all rows) ────────────────────────

const cardTypeOptions = ref<DynamicOption[]>([])
const cardTypeError   = ref('')
const doorOptions      = ref<DynamicOption[]>([])
const doorError        = ref('')

onMounted(async () => {
  if (!props.guid || !props.serviceBase) return
  try {
    const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/aeos/badge-types`)
    if (!res.ok) { cardTypeError.value = `Error ${res.status}`; return }
    cardTypeOptions.value = await res.json()
  } catch {
    cardTypeError.value = 'Could not load'
  }
  try {
    const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/aeos/doors`)
    if (!res.ok) { doorError.value = `Error ${res.status}`; return }
    doorOptions.value = await res.json()
  } catch {
    doorError.value = 'Could not load'
  }
})

function parseXml(xml: string): IPBadgeRow | null {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null
    const get = (tag: string) => doc.querySelector(tag)?.textContent ?? ''
    return {
      Type:        get('Type'),
      CardType:    get('CardType'),
      Door:        get('Door'),
      ASCII:       get('ASCII').toLowerCase() === 'true',
      IPAddress:   get('IPAddress'),
      Port:        get('Port'),
      Prefix:      get('Prefix'),
      PadToLength: get('PadToLength'),
    }
  } catch {
    return null
  }
}

function rowToXml(row: IPBadgeRow): string {
  return `<?xml version="1.0" encoding="utf-16"?>\n` +
    `<IPBadgeInterfaceModel xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n` +
    `  <Type>${escXml(row.Type)}</Type>\n` +
    `  <CardType>${escXml(row.CardType)}</CardType>\n` +
    `  <Door>${escXml(row.Door)}</Door>\n` +
    `  <ASCII>${row.ASCII}</ASCII>\n` +
    `  <IPAddress>${escXml(row.IPAddress)}</IPAddress>\n` +
    `  <Port>${escXml(row.Port)}</Port>\n` +
    `  <Prefix>${escXml(row.Prefix)}</Prefix>\n` +
    `  <PadToLength>${escXml(row.PadToLength)}</PadToLength>\n` +
    `</IPBadgeInterfaceModel>`
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const rows = computed<IPBadgeRow[]>(() => {
  const val = props.modelValue ?? ''
  return val.split(SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseXml)
    .filter((r): r is IPBadgeRow => r !== null)
})

function emitRows(next: IPBadgeRow[]) {
  emit('update:modelValue', next.map(rowToXml).join(SEPARATOR))
}

function addRow() {
  emitRows([...rows.value, { Type: 'ENTRY', CardType: '', Door: '', ASCII: false, IPAddress: 'localhost', Port: '11020', Prefix: '', PadToLength: '0' }])
}

function removeRow(idx: number) {
  emitRows(rows.value.filter((_, i) => i !== idx))
}

function updateField(idx: number, field: keyof IPBadgeRow, val: string | boolean) {
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

    <div v-if="rows.length > 0" class="flex flex-col gap-2">
      <div
        v-for="(row, idx) in rows"
        :key="idx"
        class="border border-gray-200 rounded-lg overflow-hidden"
      >
        <!-- Header -->
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
            {{ row.Type || `Mapping ${idx + 1}` }}
          </span>
          <span v-if="row.IPAddress" class="text-xs text-gray-400">{{ row.IPAddress }}:{{ row.Port }}</span>
          <button
            type="button"
            class="ml-2 text-xp-red hover:text-xp-red-hover text-xs px-2"
            @click.stop="removeRow(idx)"
          >✕</button>
        </div>

        <!-- Fields -->
        <div v-if="expanded.has(idx)" class="p-3 grid grid-cols-2 gap-3 border-t border-gray-100">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Type</label>
            <select :value="row.Type" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @change="updateField(idx, 'Type', ($event.target as HTMLSelectElement).value)">
              <option v-for="opt in TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Card Type</label>
            <select :value="row.CardType" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @change="updateField(idx, 'CardType', ($event.target as HTMLSelectElement).value)">
              <option value="">— Select —</option>
              <option v-for="opt in cardTypeOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
            </select>
            <p v-if="cardTypeError" class="text-xs text-xp-orange">{{ cardTypeError }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Door</label>
            <div class="flex items-center gap-2">
              <select :value="row.Door" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @change="updateField(idx, 'Door', ($event.target as HTMLSelectElement).value)">
                <option value="">— Select —</option>
                <option v-for="opt in doorOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
              </select>
              <input
                type="checkbox"
                :id="`ascii-${idx}`"
                :checked="row.ASCII"
                class="w-4 h-4 accent-xp-primary shrink-0"
                @change="updateField(idx, 'ASCII', ($event.target as HTMLInputElement).checked)"
              />
              <label :for="`ascii-${idx}`" class="text-sm text-gray-700 cursor-pointer shrink-0">ASCII</label>
            </div>
            <p v-if="doorError" class="text-xs text-xp-orange">{{ doorError }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">IP Address/Hostname</label>
            <input :value="row.IPAddress" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'IPAddress', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Port</label>
            <input :value="row.Port" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'Port', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Prefix</label>
            <input :value="row.Prefix" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'Prefix', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Pad to Length with 0's</label>
            <input :value="row.PadToLength" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'PadToLength', ($event.target as HTMLInputElement).value)" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
      No IP badge mappings configured
    </div>

    <button
      type="button"
      class="flex items-center gap-2 text-sm text-xp-primary hover:text-xp-primary-hover font-medium cursor-pointer w-fit"
      @click="addRow"
    >
      <span class="text-lg leading-none">+</span> Add IP Badge Mapping
    </button>
  </div>
</template>
