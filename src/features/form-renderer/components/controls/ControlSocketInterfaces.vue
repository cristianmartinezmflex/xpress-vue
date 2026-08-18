<script setup lang="ts">
/**
 * ControlSocketInterfaces
 *
 * Renders the AEOS "socket_interface_settings" field. The value is a concatenation of XML-serialized
 * SocketInterfaceModel documents (each begins with an <?xml ...?> declaration). The service splits them
 * by the <?xml boundary (AeosDataManager.SplitXmlEntries) and deserializes each with
 * XmlSerializer(SocketInterfaceModel), so the element names below MUST match that model's properties.
 *
 * SocketInterfaceModel fields (SocketHelpers/SocketInterfaceModel.vb, mirrored by the WinForm
 * ctlSocketInterface): AEPUIp, AEPUName, AEPUPort, AEPUUsername, AEPUPassword, IdentifierTypePrefix,
 * CardType. Card Type is a badge-type picker (stores the badge type external id).
 */

import { ref, computed, onMounted } from 'vue'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

interface SocketRow {
  AEPUIp:               string
  AEPUName:             string
  AEPUPort:             string
  AEPUUsername:         string
  AEPUPassword:         string
  IdentifierTypePrefix: string
  CardType:             string   // badge type external id
}

interface CardTypeOption { id: string; name: string }

const SEPARATOR = '\x08'

const props = defineProps<{
  title?:       string
  modelValue:   string   // concatenated XML documents
  loadFrom?:    string    // badge-types source for the Card Type picker
  guid?:        string
  serviceBase?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// ─── Card Type options (badge types) ─────────────────────────────────────────
const cardTypes = ref<CardTypeOption[]>([])

onMounted(async () => {
  const url = resolveLoadFromUrl(props.loadFrom, props.serviceBase ?? '', props.guid)
  if (!url) return
  try {
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) {
      cardTypes.value = data
        .map((o: any) => ({ id: String(o?.id ?? ''), name: String(o?.name ?? o?.id ?? '') }))
        .filter((o) => o.id)
    }
  } catch { /* leave empty — the id is still preserved */ }
})

function cardTypeName(id: string): string {
  return cardTypes.value.find((c) => c.id === id)?.name ?? id
}

// ─── Parse XML document → SocketRow ──────────────────────────────────────────
function parseXml(xml: string): SocketRow | null {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null
    const get = (tag: string) => doc.querySelector(tag)?.textContent ?? ''
    return {
      AEPUIp:               get('AEPUIp'),
      AEPUName:             get('AEPUName'),
      AEPUPort:             get('AEPUPort'),
      AEPUUsername:         get('AEPUUsername'),
      AEPUPassword:         get('AEPUPassword'),
      IdentifierTypePrefix: get('IdentifierTypePrefix'),
      CardType:             get('CardType'),
    }
  } catch {
    return null
  }
}

function rowToXml(row: SocketRow): string {
  return `<?xml version="1.0" encoding="utf-16"?>\n` +
    `<SocketInterfaceModel xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n` +
    `  <AEPUIp>${escXml(row.AEPUIp)}</AEPUIp>\n` +
    `  <AEPUName>${escXml(row.AEPUName)}</AEPUName>\n` +
    `  <AEPUPort>${escXml(row.AEPUPort)}</AEPUPort>\n` +
    `  <AEPUUsername>${escXml(row.AEPUUsername)}</AEPUUsername>\n` +
    `  <AEPUPassword>${escXml(row.AEPUPassword)}</AEPUPassword>\n` +
    `  <IdentifierTypePrefix>${escXml(row.IdentifierTypePrefix)}</IdentifierTypePrefix>\n` +
    `  <CardType>${escXml(row.CardType)}</CardType>\n` +
    `</SocketInterfaceModel>`
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── State ───────────────────────────────────────────────────────────────────
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
  emitRows([...rows.value, {
    AEPUIp: '', AEPUName: '', AEPUPort: '8035', AEPUUsername: '',
    AEPUPassword: '', IdentifierTypePrefix: '', CardType: '',
  }])
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
          <span class="text-sm font-semibold text-xp-label flex-1">
            {{ row.AEPUName || row.AEPUIp || `Interface ${idx + 1}` }}
          </span>
          <span v-if="row.AEPUIp" class="text-xs text-gray-400">{{ row.AEPUIp }}:{{ row.AEPUPort }}</span>
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
            <input :value="row.AEPUIp" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'AEPUIp', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Port</label>
            <input :value="row.AEPUPort" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'AEPUPort', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">AEPU Name</label>
            <input :value="row.AEPUName" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'AEPUName', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Username</label>
            <input :value="row.AEPUUsername" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'AEPUUsername', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Password</label>
            <input type="password" :value="row.AEPUPassword" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'AEPUPassword', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Prefix</label>
            <input :value="row.IdentifierTypePrefix" class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary" @input="updateField(idx, 'IdentifierTypePrefix', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Card Type</label>
            <select
              :value="row.CardType"
              class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
              @change="updateField(idx, 'CardType', ($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>Select a card type…</option>
              <!-- Keep a saved id visible even if the badge-type list hasn't loaded / no longer contains it. -->
              <option v-if="row.CardType && !cardTypes.some((c) => c.id === row.CardType)" :value="row.CardType">
                {{ cardTypeName(row.CardType) }}
              </option>
              <option v-for="ct in cardTypes" :key="ct.id" :value="ct.id">{{ ct.name }}</option>
            </select>
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
