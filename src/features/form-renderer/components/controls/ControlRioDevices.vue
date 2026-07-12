<script setup lang="ts">
/**
 * ControlRioDevices
 *
 * Renders the Genetec "rio_list" field as a list of CloudLink (RIO) devices.
 * Each device: { id, name, server, username, password, acceptUntrustedCert, allDoorsOnline, doorList }
 * State is stored as a JSON array string so it round-trips through the API cleanly.
 *
 * The backend stores rio_list as a Hashtable<int, Base64(DataContractSerializer(RIODevice))>.
 * When saving from Vue, we send a JSON array — the GenetecController handles conversion.
 */

import { ref, computed } from 'vue'

interface RioDevice {
  id:                 number
  name:               string
  server:             string
  username:           string
  password:           string
  acceptUntrustedCert: boolean
  allDoorsOnline:     boolean
  doorList:           string
}

const props = defineProps<{
  title?:     string
  modelValue: string   // JSON array or empty string
  guid?:      string
  serviceBase?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const pingStatus = ref<Record<number, string>>({})
const expanded   = ref<Set<number>>(new Set())
let   nextId     = 1

const devices = computed<RioDevice[]>(() => {
  const val = props.modelValue
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) {
      parsed.forEach((d) => { if (d.id >= nextId) nextId = d.id + 1 })
      return parsed
    }
  } catch { /* fall through */ }
  return []
})

function emitDevices(next: RioDevice[]) {
  emit('update:modelValue', next.length ? JSON.stringify(next) : '')
}

function addDevice() {
  const newDev: RioDevice = {
    id: nextId++,
    name: `CloudLink ${nextId - 1}`,
    server: '',
    username: 'admin',
    password: '',
    acceptUntrustedCert: false,
    allDoorsOnline: false,
    doorList: '',
  }
  emitDevices([...devices.value, newDev])
  expanded.value = new Set([...expanded.value, newDev.id])
}

function removeDevice(id: number) {
  emitDevices(devices.value.filter((d) => d.id !== id))
  const s = new Set(expanded.value)
  s.delete(id)
  expanded.value = s
}

function updateField(id: number, field: keyof RioDevice, val: string | boolean | number) {
  emitDevices(devices.value.map((d) => d.id === id ? { ...d, [field]: val } : d))
}

function toggleExpand(id: number) {
  const s = new Set(expanded.value)
  if (s.has(id)) s.delete(id)
  else           s.add(id)
  expanded.value = s
}

async function pingDevice(dev: RioDevice) {
  if (!props.guid || !props.serviceBase) {
    pingStatus.value = { ...pingStatus.value, [dev.id]: 'No GUID — cannot ping' }
    return
  }
  pingStatus.value = { ...pingStatus.value, [dev.id]: 'Pinging…' }
  try {
    const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/genetec/ping-rio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: dev.server, username: dev.username, password: dev.password, acceptUntrustedCert: dev.acceptUntrustedCert }),
    })
    const data = await res.json().catch(() => null)
    pingStatus.value = { ...pingStatus.value, [dev.id]: res.ok ? 'Ping OK' : (data?.Error ?? `HTTP ${res.status}`) }
  } catch {
    pingStatus.value = { ...pingStatus.value, [dev.id]: 'Connection failed' }
  }
}

async function updateRio(dev: RioDevice) {
  if (!props.guid || !props.serviceBase) { alert('No GUID — cannot update RIO.'); return }
  const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/genetec/update-rio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ server: dev.server, username: dev.username, password: dev.password, acceptUntrustedCert: dev.acceptUntrustedCert, doorList: dev.doorList, allDoorsOnline: dev.allDoorsOnline }),
  })
  if (res.ok) {
    alert('RIO update complete.')
  } else {
    const data = await res.json().catch(() => null)
    alert(`RIO update failed: ${data?.Error ?? `HTTP ${res.status}`}`)
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</span>

    <div v-if="devices.length > 0" class="flex flex-col gap-2">
      <div
        v-for="dev in devices"
        :key="dev.id"
        class="border border-gray-200 rounded-lg overflow-hidden"
      >
        <!-- Header -->
        <div
          class="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer select-none"
          @click="toggleExpand(dev.id)"
        >
          <svg
            class="w-4 h-4 text-gray-400 shrink-0 transition-transform"
            :class="expanded.has(dev.id) ? 'rotate-90' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span class="text-sm font-medium text-gray-700 flex-1">
            {{ dev.name || dev.server || `Device ${dev.id}` }}
          </span>
          <span v-if="dev.server" class="text-xs text-gray-400">{{ dev.server }}</span>
          <span
            v-if="pingStatus[dev.id]"
            class="text-xs px-2 py-0.5 rounded-full"
            :class="pingStatus[dev.id] === 'Ping OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
          >
            {{ pingStatus[dev.id] }}
          </span>
          <button
            type="button"
            class="ml-2 text-red-400 hover:text-red-600 text-xs px-2"
            @click.stop="removeDevice(dev.id)"
          >✕</button>
        </div>

        <!-- Fields -->
        <div v-if="expanded.has(dev.id)" class="p-3 border-t border-gray-100 flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Name</label>
              <input :value="dev.name" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(dev.id, 'name', ($event.target as HTMLInputElement).value)" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Server (IP / Hostname)</label>
              <input :value="dev.server" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(dev.id, 'server', ($event.target as HTMLInputElement).value)" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Username</label>
              <input :value="dev.username" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(dev.id, 'username', ($event.target as HTMLInputElement).value)" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Password</label>
              <input type="password" :value="dev.password" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" @input="updateField(dev.id, 'password', ($event.target as HTMLInputElement).value)" />
            </div>
          </div>

          <div class="flex items-center gap-6">
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                :checked="dev.acceptUntrustedCert"
                class="w-4 h-4 accent-blue-600"
                @change="updateField(dev.id, 'acceptUntrustedCert', ($event.target as HTMLInputElement).checked)"
              />
              Accept Untrusted Certificate
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                :checked="dev.allDoorsOnline"
                class="w-4 h-4 accent-blue-600"
                @change="updateField(dev.id, 'allDoorsOnline', ($event.target as HTMLInputElement).checked)"
              />
              All Doors Online
            </label>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">Door List (comma-separated door IDs)</label>
            <textarea
              :value="dev.doorList"
              rows="2"
              class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              @input="updateField(dev.id, 'doorList', ($event.target as HTMLTextAreaElement).value)"
            />
          </div>

          <!-- Device actions -->
          <div class="flex gap-2 pt-1">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 transition"
              @click="pingDevice(dev)"
            >Ping</button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-md border border-green-300 text-green-700 hover:bg-green-50 transition"
              @click="updateRio(dev)"
            >Update RIO Readers</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
      No CloudLink devices configured
    </div>

    <button
      type="button"
      class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer w-fit"
      @click="addDevice"
    >
      <span class="text-lg leading-none">+</span> Add CloudLink Device
    </button>
  </div>
</template>
