<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { FormSchema } from '@/features/form-renderer/types/schema'

const DM_SERVICE_BASE = 'http://localhost:30011'

const router  = useRouter()
const loading = ref(true)
const error   = ref<string | null>(null)

interface DataManagerItem {
  dm_guid:           string
  data_manager_type: number
  data_manager_name: string
  id_prefix:         string
  enabled:           boolean
}

const dataManagers = ref<DataManagerItem[]>([])

// Auto-discover every schema in ./data. The filename (without extension) is matched against the
// database DM's `data_manager_name`, so adding a DM only needs a new ./data/<name>.json.
interface SchemaEntry { key: string; title: string }
const schemaModules = import.meta.glob<{ default: FormSchema }>('@/data/*.json', { eager: true })
const allSchemas: SchemaEntry[] = Object.entries(schemaModules).map(([path, mod]) => {
  const key = path.split('/').pop()!.replace(/\.json$/, '')
  return { key, title: mod.default.title ?? key }
})

const norm = (s: string) => s.trim().toLowerCase()
const schemaByName: Record<string, SchemaEntry> = Object.fromEntries(allSchemas.map((s) => [norm(s.key), s]))

// Merge DB list with ./data schemas by name:
//   - DB DM whose name matches a schema  → first section ("Data Managers")
//   - schema with no matching DB DM       → second section ("Demo & Showcase")
const matchedDms = computed(() =>
  dataManagers.value
    .map((dm) => ({ dm, schema: schemaByName[norm(dm.data_manager_name)] }))
    .filter((x): x is { dm: DataManagerItem; schema: SchemaEntry } => !!x.schema),
)

const dbNames = computed(() => new Set(dataManagers.value.map((dm) => norm(dm.data_manager_name))))
const demoSchemas = computed(() => allSchemas.filter((s) => !dbNames.value.has(norm(s.key))))

function openSchema(key: string, guid?: string) {
  router.push({ path: `/form/${key}`, query: guid ? { guid } : {} })
}

async function reloadDataManagers() {
  try {
    const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers`)
    if (!res.ok) { error.value = `The service responded ${res.status}`; return }
    const data: DataManagerItem[] = await res.json()
    dataManagers.value = data.sort((a, b) => a.data_manager_name.localeCompare(b.data_manager_name))
    error.value = null
  } catch {
    error.value = `Could not connect to the service at ${DM_SERVICE_BASE}`
  }
}

onMounted(async () => {
  loading.value = true
  await reloadDataManagers()
  loading.value = false
})

// ─── Export / Import settings (JSON) ────────────────────────────────────────────

const importInput = ref<HTMLInputElement | null>(null)
const importing   = ref(false)

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Export a single DM's settings as a downloadable JSON file (same format as the WinForm).
async function exportDm(dm: DataManagerItem) {
  try {
    const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${dm.dm_guid}/export-settings`)
    if (!res.ok) { alert(`Export failed: HTTP ${res.status}`); return }
    const blob = await res.blob()
    const cd   = res.headers.get('Content-Disposition') ?? ''
    const match = cd.match(/filename="?([^"]+)"?/i)
    const fileName = match?.[1] ?? `${dm.data_manager_name}-settings.json`
    downloadBlob(blob, fileName)
  } catch {
    alert('Could not reach the service to export settings.')
  }
}

function triggerImport() {
  importInput.value?.click()
}

// Import a settings JSON file: upsert the DM by dm_guid, then refresh the list.
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file  = input.files?.[0]
  input.value = ''  // allow re-selecting the same file later
  if (!file) return

  importing.value = true
  try {
    const text = await file.text()
    const res  = await fetch(`${DM_SERVICE_BASE}/api/data-managers/import-settings`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    text,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      alert(`Import failed: ${body?.Error ?? body?.error ?? `HTTP ${res.status}`}`)
      return
    }
    const saved = await res.json().catch(() => null)
    await reloadDataManagers()
    alert(`Settings imported successfully${saved?.data_manager_name ? ` for "${saved.data_manager_name}"` : ''}.`)
  } catch {
    alert('Could not import the settings file.')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-10">

    <!-- Header -->
    <div class="max-w-4xl mx-auto mb-10 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">XPressEntry</h1>
        <p class="mt-1 text-sm text-gray-500">Select a data manager to configure.</p>
      </div>
      <button
        type="button"
        class="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-xp-primary text-xp-primary hover:bg-xp-light-hover transition cursor-pointer disabled:opacity-60"
        :disabled="importing"
        title="Import a Data Manager settings JSON file"
        @click="triggerImport"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" />
        </svg>
        {{ importing ? 'Importing…' : 'Import Settings' }}
      </button>
      <input
        ref="importInput"
        type="file"
        accept="application/json,.json"
        class="hidden"
        @change="onImportFile"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="max-w-4xl mx-auto text-sm text-gray-400">
      Loading data managers...
    </div>

    <template v-else>
      <!-- First section: Data Managers that come from the database (matched to a ./data schema) -->
      <div class="max-w-4xl mx-auto">
        <p class="text-xs font-semibold uppercase tracking-wider text-xp-label mb-3">Data Managers</p>

        <div v-if="error" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-4">
          {{ error }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="{ dm, schema } in matchedDms"
            :key="dm.dm_guid"
            role="button"
            tabindex="0"
            class="group text-left bg-white rounded-xl border border-gray-200 shadow-xp p-6 flex flex-col gap-4 hover:shadow-md hover:border-xp-primary transition cursor-pointer"
            @click="openSchema(schema.key, dm.dm_guid)"
            @keydown.enter="openSchema(schema.key, dm.dm_guid)"
          >
            <span class="text-3xl">⚙️</span>
            <div class="flex-1">
              <h2 class="text-base font-semibold text-gray-900 group-hover:text-xp-primary transition">
                {{ dm.data_manager_name }}
              </h2>
              <p v-if="dm.id_prefix" class="mt-0.5 text-xs text-gray-400">Prefix: {{ dm.id_prefix }}</p>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1 text-sm font-medium text-xp-primary group-hover:gap-2 transition-all">
                Configure
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <button
                type="button"
                class="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-xp-primary px-2 py-1 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                title="Export this Data Manager's settings as JSON"
                @click.stop="exportDm(dm)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 16V4m0 12l4-4m-4 4l-4-4" />
                </svg>
                Export
              </button>
            </div>
          </div>

          <div v-if="matchedDms.length === 0" class="col-span-full text-sm text-gray-400 py-8">
            No database data managers have a schema in ./data.
          </div>
        </div>
      </div>

      <!-- Demo & Showcase: schemas in ./data with no matching database DM -->
      <div v-if="demoSchemas.length" class="max-w-4xl mx-auto mt-10">
        <p class="text-xs font-semibold uppercase tracking-wider text-xp-label mb-3">Demo &amp; Showcase</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <button
            v-for="s in demoSchemas"
            :key="s.key"
            type="button"
            class="group text-left bg-white rounded-xl border border-dashed border-gray-300 shadow-xp p-6 flex flex-col gap-4 hover:shadow-md hover:border-xp-orange transition cursor-pointer"
            @click="openSchema(s.key)"
          >
            <span class="text-3xl">🧩</span>
            <div class="flex-1">
              <h2 class="text-base font-semibold text-gray-900 group-hover:text-xp-orange transition">
                {{ s.title }}
              </h2>
            </div>
            <div class="flex items-center gap-1 text-sm font-medium text-xp-orange group-hover:gap-2 transition-all">
              Configure
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </template>

  </div>
</template>
