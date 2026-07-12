<script setup lang="ts">
/**
 * ControlSiteTimezones
 *
 * Manages the RS2 "site_timezones" field.
 * WinForms stores it as a Hashtable { siteGUID → Windows TZ ID string }.
 * We store it in form state as a JSON string of an array:
 *   [{ siteId: string, siteName: string, timezone: string }]
 * On save, dm-shared-actions converts the array back to the flat object format.
 *
 * The parent can call rs2_loadSites to populate the available sites list,
 * which is stored in a shared state key "rs2_sites_cache" on the form state.
 */

import { ref, computed } from 'vue'

interface SiteRow {
  siteId:   string
  siteName: string
  timezone: string
}

const WINDOWS_TIMEZONES = [
  'Eastern Standard Time',
  'Central Standard Time',
  'US Mountain Standard Time',
  'Mountain Standard Time',
  'Pacific Standard Time',
  'Alaskan Standard Time',
  'Hawaiian Standard Time',
  'GMT Standard Time',
  'UTC',
  'Central European Standard Time',
  'W. Europe Standard Time',
  'AUS Eastern Standard Time',
  'Tokyo Standard Time',
  'China Standard Time',
  'India Standard Time',
  'Arabian Standard Time',
  'SA Eastern Standard Time',
  'E. South America Standard Time',
]

const props = defineProps<{
  title?:       string
  modelValue:   string   // JSON array string
  guid?:        string
  serviceBase?: string
  state?:       Record<string, any>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const loadedSites = ref<{ id: string; name: string }[]>([])
const loading     = ref(false)
const newSiteId   = ref('')
const newTz       = ref(WINDOWS_TIMEZONES[0])

const rows = computed<SiteRow[]>(() => {
  const val = props.modelValue
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed
    // Convert from flat object {siteId: tz} if loaded from API
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(([siteId, timezone]) => ({
        siteId,
        siteName: siteId,
        timezone: timezone as string,
      }))
    }
  } catch { /* fall through */ }
  return []
})

// Sites list: use loaded sites cache from state, or from loadedSites ref
const availableSites = computed<{ id: string; name: string }[]>(() => {
  if (loadedSites.value.length > 0) return loadedSites.value
  // Build from current rows so existing entries show up
  return rows.value.map((r) => ({ id: r.siteId, name: r.siteName }))
})

function emitRows(next: SiteRow[]) {
  emit('update:modelValue', next.length ? JSON.stringify(next) : '')
}

function addRow() {
  if (!newSiteId.value) return
  const existing = rows.value.find((r) => r.siteId === newSiteId.value)
  if (existing) return
  const site = availableSites.value.find((s) => s.id === newSiteId.value)
  emitRows([...rows.value, { siteId: newSiteId.value, siteName: site?.name ?? newSiteId.value, timezone: newTz.value }])
  newSiteId.value = ''
}

function removeRow(siteId: string) {
  emitRows(rows.value.filter((r) => r.siteId !== siteId))
}

function updateTimezone(siteId: string, timezone: string) {
  emitRows(rows.value.map((r) => r.siteId === siteId ? { ...r, timezone } : r))
}

async function loadSites() {
  if (!props.guid || !props.serviceBase) {
    alert('Save the form first and provide a GUID to load sites.')
    return
  }
  loading.value = true
  try {
    const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/rs2/sites`)
    if (!res.ok) { alert(`Error loading sites: HTTP ${res.status}`); return }
    const data: { id: string; name: string }[] = await res.json()
    loadedSites.value = [{ id: '-1', name: 'All Sites' }, ...data]
    // Enrich existing rows with names from the loaded list
    const enriched = rows.value.map((r) => {
      const site = loadedSites.value.find((s) => s.id === r.siteId)
      return site ? { ...r, siteName: site.name } : r
    })
    if (enriched.length > 0) emitRows(enriched)
  } catch {
    alert('Could not load sites from RS2. Check your connection settings.')
  } finally {
    loading.value = false
  }
}

defineExpose({ loadSites })
</script>

<template>
  <div class="flex flex-col gap-4">
    <span v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</span>

    <!-- Load Sites inline button -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 transition"
        :disabled="loading"
        @click="loadSites"
      >
        {{ loading ? 'Loading…' : 'Load Sites from RS2' }}
      </button>
      <span v-if="loadedSites.length > 0" class="text-xs text-green-600">
        {{ loadedSites.length }} site(s) loaded
      </span>
    </div>

    <!-- Add new row -->
    <div class="flex items-end gap-2">
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">Site</label>
        <select
          v-model="newSiteId"
          class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— select a site —</option>
          <option
            v-for="s in availableSites"
            :key="s.id"
            :value="s.id"
          >{{ s.name }} ({{ s.id }})</option>
          <option value="__manual__">Enter ID manually…</option>
        </select>
        <input
          v-if="newSiteId === '__manual__'"
          v-model="newSiteId"
          placeholder="Site GUID"
          class="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">Timezone</label>
        <select
          v-model="newTz"
          class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="tz in WINDOWS_TIMEZONES" :key="tz" :value="tz">{{ tz }}</option>
        </select>
      </div>
      <button
        type="button"
        class="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 text-lg leading-none pb-0.5"
        :disabled="!newSiteId || newSiteId === '__manual__'"
        @click="addRow"
      >+</button>
    </div>

    <!-- Rows table -->
    <div v-if="rows.length > 0" class="border border-gray-200 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-3 py-2 text-xs font-medium text-gray-600">Site</th>
            <th class="text-left px-3 py-2 text-xs font-medium text-gray-600">Timezone</th>
            <th class="w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.siteId" class="border-t border-gray-100">
            <td class="px-3 py-2 text-gray-700">
              {{ row.siteName !== row.siteId ? row.siteName : '' }}
              <span class="text-xs text-gray-400 block">{{ row.siteId }}</span>
            </td>
            <td class="px-3 py-2">
              <select
                :value="row.timezone"
                class="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                @change="updateTimezone(row.siteId, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="tz in WINDOWS_TIMEZONES" :key="tz" :value="tz">{{ tz }}</option>
              </select>
            </td>
            <td class="px-2 py-2 text-center">
              <button
                type="button"
                class="text-red-400 hover:text-red-600 text-xs"
                @click="removeRow(row.siteId)"
              >✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
      No site timezone overrides configured. Add one above or click "Load Sites from RS2".
    </div>
  </div>
</template>
