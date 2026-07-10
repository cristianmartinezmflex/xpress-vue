<script setup lang="ts">
/**
 * ControlIpBadgeMappings
 *
 * Renders the AEOS "ip_badge_settings" field.
 * Value is a vbBack-separated string of XML-serialized IPBadgeInterfaceModel objects.
 *
 * IPBadgeInterfaceModel fields (from WinForms ctlIPBadgeSelection):
 *   Name, ServerAddress, BadgeTypeExternalId, DoorExternalId, ReaderExternalId,
 *   Username, Password, UseSSL
 */

import { ref, computed } from 'vue'

interface IPBadgeRow {
  Name:                string
  ServerAddress:       string
  BadgeTypeExternalId: string
  DoorExternalId:      string
  ReaderExternalId:    string
  Username:            string
  Password:            string
  UseSSL:              boolean
}

const SEPARATOR = '\x08'

const props = defineProps<{
  title?:     string
  modelValue: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function parseXml(xml: string): IPBadgeRow | null {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null
    const get = (tag: string) => doc.querySelector(tag)?.textContent ?? ''
    return {
      Name:                get('Name'),
      ServerAddress:       get('ServerAddress'),
      BadgeTypeExternalId: get('BadgeTypeExternalId'),
      DoorExternalId:      get('DoorExternalId'),
      ReaderExternalId:    get('ReaderExternalId'),
      Username:            get('Username'),
      Password:            get('Password'),
      UseSSL:              get('UseSSL').toLowerCase() === 'true',
    }
  } catch {
    return null
  }
}

function rowToXml(row: IPBadgeRow): string {
  return `<?xml version="1.0" encoding="utf-16"?>\n` +
    `<IPBadgeInterfaceModel xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n` +
    `  <Name>${escXml(row.Name)}</Name>\n` +
    `  <ServerAddress>${escXml(row.ServerAddress)}</ServerAddress>\n` +
    `  <BadgeTypeExternalId>${escXml(row.BadgeTypeExternalId)}</BadgeTypeExternalId>\n` +
    `  <DoorExternalId>${escXml(row.DoorExternalId)}</DoorExternalId>\n` +
    `  <ReaderExternalId>${escXml(row.ReaderExternalId)}</ReaderExternalId>\n` +
    `  <Username>${escXml(row.Username)}</Username>\n` +
    `  <Password>${escXml(row.Password)}</Password>\n` +
    `  <UseSSL>${row.UseSSL}</UseSSL>\n` +
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
  emitRows([...rows.value, { Name: '', ServerAddress: '', BadgeTypeExternalId: '', DoorExternalId: '', ReaderExternalId: '', Username: '', Password: '', UseSSL: false }])
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
    <span v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</span>

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
            {{ row.Name || row.ServerAddress || `Mapping ${idx + 1}` }}
          </span>
          <span v-if="row.ServerAddress" class="text-xs text-gray-400">{{ row.ServerAddress }}</span>
          <button
            type="button"
            class="ml-2 text-red-400 hover:text-red-600 text-xs px-2"
            @click.stop="removeRow(idx)"
          >✕</button>
        </div>

        <!-- Fields -->
        <div v-if="expanded.has(idx)" class="p-3 grid grid-cols-2 gap-3 border-t border-gray-100">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Name</label>
            <input :value="row.Name" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'Name', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Server Address</label>
            <input :value="row.ServerAddress" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'ServerAddress', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Badge Type External ID</label>
            <input :value="row.BadgeTypeExternalId" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'BadgeTypeExternalId', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Door External ID</label>
            <input :value="row.DoorExternalId" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'DoorExternalId', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Reader External ID</label>
            <input :value="row.ReaderExternalId" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'ReaderExternalId', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Username</label>
            <input :value="row.Username" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'Username', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Password</label>
            <input type="password" :value="row.Password" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(idx, 'Password', ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="flex items-center gap-2 pt-4">
            <input
              type="checkbox"
              :id="`ssl-${idx}`"
              :checked="row.UseSSL"
              class="w-4 h-4 accent-blue-600"
              @change="updateField(idx, 'UseSSL', ($event.target as HTMLInputElement).checked)"
            />
            <label :for="`ssl-${idx}`" class="text-sm text-gray-700 cursor-pointer">Use SSL</label>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
      No IP badge mappings configured
    </div>

    <button
      type="button"
      class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer w-fit"
      @click="addRow"
    >
      <span class="text-lg leading-none">+</span> Add IP Badge Mapping
    </button>
  </div>
</template>

