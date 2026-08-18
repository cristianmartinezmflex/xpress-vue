<script setup lang="ts">
/**
 * ControlIpBadgeMappings
 *
 * Renders the AEOS "ip_badge_settings" field. The value is a concatenation of XML-serialized
 * IPBadgeInterfaceModel documents; the service splits them by the <?xml boundary
 * (AeosDataManager.SplitXmlEntries) and deserializes each with XmlSerializer(IPBadgeInterfaceModel),
 * so the element names below MUST match that model's properties.
 *
 * IPBadgeInterfaceModel fields (SocketHelpers/IPBadgeInterfaceModel.vb, mirrored by the WinForm
 * ctlIPBadgeSelection): IPBadgeType (Type: ENTRY/EXIT/MUSTER), DoorOrReader (door id for ENTRY/EXIT,
 * reader id for MUSTER), ASCII, IPAddress, Port, CardType (badge type id), IdentifierTypePrefix (Prefix),
 * PadZeroesLength.
 */

import { ref, computed, onMounted } from 'vue'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

interface IPBadgeRow {
  IPBadgeType:          string   // ENTRY | EXIT | MUSTER
  DoorOrReader:         string   // door id (ENTRY/EXIT) or reader id (MUSTER)
  ASCII:                boolean
  IPAddress:            string
  Port:                 string
  CardType:             string   // badge type external id
  IdentifierTypePrefix: string
  PadZeroesLength:      string   // integer as string
}

interface Option { id: string; name: string }

const TYPES = ['ENTRY', 'EXIT', 'MUSTER']
const SEPARATOR = '\x08'

const props = defineProps<{
  title?:       string
  modelValue:   string
  guid?:        string
  serviceBase?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// ─── Option lists (badge types, doors, readers) ──────────────────────────────
const cardTypes = ref<Option[]>([])
const doors     = ref<Option[]>([])
const readers   = ref<Option[]>([])

async function loadInto(shortForm: string, target: typeof cardTypes) {
  const url = resolveLoadFromUrl(shortForm, props.serviceBase ?? '', props.guid)
  if (!url) return
  try {
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) {
      target.value = data
        .map((o: any) => ({ id: String(o?.id ?? ''), name: String(o?.name ?? o?.id ?? '') }))
        .filter((o) => o.id)
    }
  } catch { /* leave empty — ids are still preserved */ }
}

onMounted(() => {
  loadInto('shared/badge_types', cardTypes)
  loadInto('shared/doors', doors)
  loadInto('shared/readers', readers)
})

function isDoorType(t: string): boolean { return t === 'ENTRY' || t === 'EXIT' }
function targetOptions(t: string): Option[] { return isDoorType(t) ? doors.value : readers.value }
function optionName(list: Option[], id: string): string { return list.find((o) => o.id === id)?.name ?? id }

// ─── Parse / serialize XML ───────────────────────────────────────────────────
function parseXml(xml: string): IPBadgeRow | null {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null
    const get = (tag: string) => doc.querySelector(tag)?.textContent ?? ''
    return {
      IPBadgeType:          get('IPBadgeType'),
      DoorOrReader:         get('DoorOrReader'),
      ASCII:                get('ASCII').toLowerCase() === 'true',
      IPAddress:            get('IPAddress'),
      Port:                 get('Port'),
      CardType:             get('CardType'),
      IdentifierTypePrefix: get('IdentifierTypePrefix'),
      PadZeroesLength:      get('PadZeroesLength') || '0',
    }
  } catch {
    return null
  }
}

function rowToXml(row: IPBadgeRow): string {
  const pad = String(parseInt(row.PadZeroesLength, 10) || 0)
  return `<?xml version="1.0" encoding="utf-16"?>\n` +
    `<IPBadgeInterfaceModel xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n` +
    `  <IPBadgeType>${escXml(row.IPBadgeType)}</IPBadgeType>\n` +
    `  <DoorOrReader>${escXml(row.DoorOrReader)}</DoorOrReader>\n` +
    `  <ASCII>${row.ASCII}</ASCII>\n` +
    `  <IPAddress>${escXml(row.IPAddress)}</IPAddress>\n` +
    `  <Port>${escXml(row.Port)}</Port>\n` +
    `  <CardType>${escXml(row.CardType)}</CardType>\n` +
    `  <IdentifierTypePrefix>${escXml(row.IdentifierTypePrefix)}</IdentifierTypePrefix>\n` +
    `  <PadZeroesLength>${pad}</PadZeroesLength>\n` +
    `</IPBadgeInterfaceModel>`
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── State ───────────────────────────────────────────────────────────────────
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
  emitRows([...rows.value, {
    IPBadgeType: 'ENTRY', DoorOrReader: '', ASCII: false, IPAddress: 'localhost',
    Port: '11020', CardType: '', IdentifierTypePrefix: '', PadZeroesLength: '0',
  }])
}

function removeRow(idx: number) {
  emitRows(rows.value.filter((_, i) => i !== idx))
}

function updateField(idx: number, field: keyof IPBadgeRow, val: string | boolean) {
  const next = rows.value.map((r, i) => {
    if (i !== idx) return r
    const updated = { ...r, [field]: val }
    // Switching between a Door type and a Reader type clears the picked target (WinForm parity).
    if (field === 'IPBadgeType' && isDoorType(r.IPBadgeType) !== isDoorType(val as string)) {
      updated.DoorOrReader = ''
    }
    return updated
  })
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
          <span class="text-sm font-semibold text-xp-label flex-1">
            {{ row.IPBadgeType }} — {{ optionName(targetOptions(row.IPBadgeType), row.DoorOrReader) || `Mapping ${idx + 1}` }}
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
            <select
              :value="row.IPBadgeType"
              class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
              @change="updateField(idx, 'IPBadgeType', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Card Type</label>
            <select
              :value="row.CardType"
              class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
              @change="updateField(idx, 'CardType', ($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>Select a card type…</option>
              <option v-if="row.CardType && !cardTypes.some((c) => c.id === row.CardType)" :value="row.CardType">
                {{ optionName(cardTypes, row.CardType) }}
              </option>
              <option v-for="ct in cardTypes" :key="ct.id" :value="ct.id">{{ ct.name }}</option>
            </select>
          </div>
          <div class="flex items-end gap-3 col-span-2">
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs text-gray-500">{{ isDoorType(row.IPBadgeType) ? 'Door' : 'Reader' }}</label>
              <select
                :value="row.DoorOrReader"
                class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
                @change="updateField(idx, 'DoorOrReader', ($event.target as HTMLSelectElement).value)"
              >
                <option value="" disabled>Select a {{ isDoorType(row.IPBadgeType) ? 'door' : 'reader' }}…</option>
                <option v-if="row.DoorOrReader && !targetOptions(row.IPBadgeType).some((o) => o.id === row.DoorOrReader)" :value="row.DoorOrReader">
                  {{ optionName(targetOptions(row.IPBadgeType), row.DoorOrReader) }}
                </option>
                <option v-for="o in targetOptions(row.IPBadgeType)" :key="o.id" :value="o.id">{{ o.name }}</option>
              </select>
            </div>
            <label class="flex items-center gap-2 h-9 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                :checked="row.ASCII"
                class="w-4 h-4 accent-xp-primary"
                @change="updateField(idx, 'ASCII', ($event.target as HTMLInputElement).checked)"
              />
              <span class="text-sm text-gray-700">ASCII</span>
            </label>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">IP Address / Hostname</label>
            <input :value="row.IPAddress" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'IPAddress', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Port</label>
            <input type="number" :value="row.Port" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'Port', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Prefix</label>
            <input :value="row.IdentifierTypePrefix" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'IdentifierTypePrefix', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Pad to Length with 0's</label>
            <input type="number" min="0" :value="row.PadZeroesLength" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'PadZeroesLength', ($event.target as HTMLInputElement).value)" />
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
