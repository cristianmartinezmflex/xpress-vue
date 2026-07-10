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
 * SocketInterfaceModel fields (from WinForms ctlSocketInterface):
 *   Name, IPAddress, Port, BadgeTypeExternalId, Username, Password, SendHeartbeat
 */

import { ref, computed } from 'vue'

interface SocketRow {
  Name:                string
  IPAddress:           string
  Port:                string
  BadgeTypeExternalId: string
  Username:            string
  Password:            string
  SendHeartbeat:       boolean
}

const SEPARATOR = '\x08'

const props = defineProps<{
  title?:     string
  modelValue: string   // vbBack-separated XML strings
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// ─── Parse XML string → SocketRow ────────────────────────────────────────────

function parseXml(xml: string): SocketRow | null {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null
    const get = (tag: string) => doc.querySelector(tag)?.textContent ?? ''
    return {
      Name:                get('Name'),
      IPAddress:           get('IPAddress'),
      Port:                get('Port'),
      BadgeTypeExternalId: get('BadgeTypeExternalId'),
      Username:            get('Username'),
      Password:            get('Password'),
      SendHeartbeat:       get('SendHeartbeat').toLowerCase() === 'true',
    }
  } catch {
    return null
  }
}

function rowToXml(row: SocketRow): string {
  return `<?xml version="1.0" encoding="utf-16"?>\n` +
    `<SocketInterfaceModel xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n` +
    `  <Name>${escXml(row.Name)}</Name>\n` +
    `  <IPAddress>${escXml(row.IPAddress)}</IPAddress>\n` +
    `  <Port>${escXml(row.Port)}</Port>\n` +
    `  <BadgeTypeExternalId>${escXml(row.BadgeTypeExternalId)}</BadgeTypeExternalId>\n` +
    `  <Username>${escXml(row.Username)}</Username>\n` +
    `  <Password>${escXml(row.Password)}</Password>\n` +
    `  <SendHeartbeat>${row.SendHeartbeat}</SendHeartbeat>\n` +
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
  emitRows([...rows.value, { Name: '', IPAddress: '', Port: '8035', BadgeTypeExternalId: '', Username: '', Password: '', SendHeartbeat: false }])
}

function removeRow(idx: number) {
  emitRows(rows.value.filter((_, i) => i !== idx))
}

function updateField(idx: number, field: keyof SocketRow, val: string | boolean) {
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
    <span v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</span>

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
            {{ row.Name || row.IPAddress || `Interface ${idx + 1}` }}
          </span>
          <span v-if="row.IPAddress" class="text-xs text-gray-400">{{ row.IPAddress }}:{{ row.Port }}</span>
          <button
            type="button"
            class="ml-2 text-red-400 hover:text-red-600 text-xs px-2"
            @click.stop="removeRow(idx)"
          >✕</button>
        </div>

        <!-- Expanded fields -->
        <div v-if="expanded.has(idx)" class="p-3 grid grid-cols-2 gap-3 border-t border-gray-100">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Name</label>
            <input :value="row.Name" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'Name', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">IP Address</label>
            <input :value="row.IPAddress" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'IPAddress', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Port</label>
            <input :value="row.Port" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'Port', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Badge Type External ID</label>
            <input :value="row.BadgeTypeExternalId" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'BadgeTypeExternalId', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Username</label>
            <input :value="row.Username" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'Username', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Password</label>
            <input type="password" :value="row.Password" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'Password', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              :id="`sh-${idx}`"
              :checked="row.SendHeartbeat"
              class="w-4 h-4 accent-blue-600"
              @change="updateField(idx, 'SendHeartbeat', ($event.target as HTMLInputElement).checked)"
            />
            <label :for="`sh-${idx}`" class="text-sm text-gray-700 cursor-pointer">Send Heartbeat</label>
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
      class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer w-fit"
      @click="addRow"
    >
      <span class="text-lg leading-none">+</span> Add Socket Interface
    </button>
  </div>
</template>

