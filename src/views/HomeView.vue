<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const DM_SERVICE_BASE = 'http://localhost:30011'

const router  = useRouter()
const loading = ref(true)
const error   = ref<string | null>(null)

interface DataManagerItem {
  dm_guid:              string
  data_manager_type:    number
  data_manager_name:    string
  id_prefix:            string
  enabled:              boolean
}

const dataManagers = ref<DataManagerItem[]>([])

// Maps data_manager_type int → Vue schema key (only types with a JSON schema defined)
const DM_TYPE_SCHEMA: Record<number, string> = {
  1:  'on-guard',
  61: 'galaxy-rest',
}

// Icon/badge for API-loaded DMs (keyed by schema key)
const DM_META: Record<string, { icon: string; badge: string; badgeColor: string }> = {
  'on-guard':    { icon: '🛡️', badge: 'OnGuard',     badgeColor: 'bg-green-100 text-green-700' },
  'galaxy-rest': { icon: '🔗', badge: 'Galaxy REST',  badgeColor: 'bg-blue-100 text-blue-700'  },
}

// Local/demo schemas — always shown regardless of API state
const LOCAL_SCHEMAS: Array<{ key: string; label: string; icon: string; badge: string; badgeColor: string }> = [
  { key: 'cloud-identity', label: 'Cloud Identity Sync', icon: '☁️', badge: 'Demo', badgeColor: 'bg-purple-100 text-purple-700' },
]

function schemaKey(dm: DataManagerItem): string | null {
  return DM_TYPE_SCHEMA[dm.data_manager_type] ?? null
}

function meta(dm: DataManagerItem) {
  const key = schemaKey(dm)
  return key ? DM_META[key] : { icon: '⚙️', badge: 'Data Manager', badgeColor: 'bg-gray-100 text-gray-600' }
}

function navigateToDm(dm: DataManagerItem) {
  const key = schemaKey(dm)
  if (!key) return
  router.push({ path: `/form/${key}`, query: { guid: dm.dm_guid } })
}

onMounted(async () => {
  try {
    const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers`)
    if (!res.ok) {
      error.value = `El servicio respondió ${res.status}`
      return
    }
    const data: DataManagerItem[] = await res.json()
    dataManagers.value = data.filter(dm => dm.enabled && schemaKey(dm) !== null)
  } catch {
    error.value = `No se pudo conectar al servicio en ${DM_SERVICE_BASE}`
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-10">

    <!-- Header -->
    <div class="max-w-4xl mx-auto mb-10">
      <h1 class="text-2xl font-bold text-gray-900">XPressEntry</h1>
      <p class="mt-1 text-sm text-gray-500">Select a data manager to configure.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="max-w-4xl mx-auto text-sm text-gray-400">
      Loading data managers...
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-4xl mx-auto">
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {{ error }} — mostrando configuración estática.
      </div>

      <!-- Fallback: static cards -->
      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <button
          v-for="[key, m] in Object.entries(DM_META)"
          :key="key"
          type="button"
          class="group text-left bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md hover:border-blue-300 transition cursor-pointer"
          @click="router.push(`/form/${key}`)"
        >
          <div class="flex items-start justify-between">
            <span class="text-3xl">{{ m.icon }}</span>
            <span class="text-xs font-medium px-2 py-1 rounded-full" :class="m.badgeColor">
              {{ m.badge }}
            </span>
          </div>
          <div class="flex-1">
            <h2 class="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition">
              {{ m.badge }}
            </h2>
          </div>
          <div class="flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
            Configure
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- Cards from API -->
    <div v-else class="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <button
        v-for="dm in dataManagers"
        :key="dm.dm_guid"
        type="button"
        class="group text-left bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md hover:border-blue-300 transition cursor-pointer"
        @click="navigateToDm(dm)"
      >
        <div class="flex items-start justify-between">
          <span class="text-3xl">{{ meta(dm).icon }}</span>
          <span class="text-xs font-medium px-2 py-1 rounded-full" :class="meta(dm).badgeColor">
            {{ meta(dm).badge }}
          </span>
        </div>
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition">
            {{ dm.data_manager_name }}
          </h2>
          <p v-if="dm.id_prefix" class="mt-0.5 text-xs text-gray-400">Prefix: {{ dm.id_prefix }}</p>
        </div>
        <div class="flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
          Configure
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      <div
        v-if="dataManagers.length === 0"
        class="col-span-full text-center text-sm text-gray-400 py-16"
      >
        No hay data managers habilitados configurados.
      </div>
    </div>

    <!-- Local / demo schemas — always visible -->
    <div v-if="!loading" class="max-w-4xl mx-auto mt-8">
      <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Demo & Showcase</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <button
          v-for="s in LOCAL_SCHEMAS"
          :key="s.key"
          type="button"
          class="group text-left bg-white rounded-xl border border-dashed border-gray-300 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md hover:border-purple-300 transition cursor-pointer"
          @click="router.push(`/form/${s.key}`)"
        >
          <div class="flex items-start justify-between">
            <span class="text-3xl">{{ s.icon }}</span>
            <span class="text-xs font-medium px-2 py-1 rounded-full" :class="s.badgeColor">
              {{ s.badge }}
            </span>
          </div>
          <div class="flex-1">
            <h2 class="text-base font-semibold text-gray-900 group-hover:text-purple-600 transition">
              {{ s.label }}
            </h2>
          </div>
          <div class="flex items-center gap-1 text-sm font-medium text-purple-600 group-hover:gap-2 transition-all">
            Configure
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>

  </div>
</template>
