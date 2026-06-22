<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormRenderer from '@/features/form-renderer/components/FormRenderer.vue'
import type { FormSchema } from '@/features/form-renderer/types/schema'

const DM_SERVICE_BASE = 'http://localhost:30011'

const route  = useRoute()
const router = useRouter()

const schema       = ref<FormSchema | null>(null)
const loading      = ref(true)
const notFound     = ref(false)
const dmValues     = ref<Record<string, any> | undefined>(undefined)
const apiError     = ref<string | null>(null)
const saving       = ref(false)
const saveResult   = ref<'ok' | 'error' | null>(null)
const formRenderer = ref<InstanceType<typeof FormRenderer> | null>(null)

const schemaMap: Record<string, () => Promise<any>> = {
  'example':     () => import('@/data/example.json'),
  'galaxy-rest': () => import('@/data/galaxy-rest.json'),
  'on-guard':    () => import('@/data/on-guard.json'),
}

const title = computed(() => {
  const map: Record<string, string> = {
    'example':     'Example',
    'galaxy-rest': 'Galaxy REST Data Manager',
    'on-guard':    'OnGuard Data Manager',
  }
  return map[route.params.schema as string] ?? 'Form'
})

async function loadSchema(key: string) {
  loading.value  = true
  notFound.value = false
  schema.value   = null
  dmValues.value = undefined
  apiError.value = null

  const loader = schemaMap[key]
  if (!loader) { notFound.value = true; loading.value = false; return }

  const mod    = await loader()
  schema.value = mod.default as FormSchema

  // If a DM GUID is provided as query param, fetch saved values from the service.
  // URL format: /form/on-guard?guid=<dm-guid>
  const guid = route.query.guid as string | undefined
  if (guid) {
    try {
      const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${guid}`)
      if (res.ok) {
        dmValues.value = await res.json()
      } else {
        apiError.value = `Service returned ${res.status} for GUID ${guid}`
      }
    } catch {
      // Service is not running — form loads with schema defaults silently.
      apiError.value = `Could not reach DM service at ${DM_SERVICE_BASE}`
    }
  }

  loading.value = false
}

watch(() => route.params.schema, (key) => loadSchema(key as string), { immediate: true })

async function saveSettings() {
  const guid = route.query.guid as string | undefined
  if (!guid) {
    alert('No GUID provided — cannot save to service.')
    return
  }

  const state = formRenderer.value?.state
  if (!state) return

  saving.value    = true
  saveResult.value = null

  try {
    const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${guid}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(state),
    })
    saveResult.value = res.ok ? 'ok' : 'error'
    if (!res.ok) {
      alert(`Error al guardar: el servicio devolvió ${res.status}`)
    }
  } catch {
    saveResult.value = 'error'
    alert(`No se pudo conectar al servicio en ${DM_SERVICE_BASE}`)
  } finally {
    saving.value = false
    setTimeout(() => { saveResult.value = null }, 3000)
  }
}

const actions: Record<string, () => void> = {
  testConnect:        () => alert('Test Connect: Connection successful!'),
  setDefaults:        () => alert('Defaults: All values reset to defaults.'),
  save:               () => saveSettings(),
  checkSubscriptions: () => alert('Checking XPressEntry Subscriptions...'),
  deleteSubscription: () => alert('Current Subscription deleted.'),
  updateSegmentList:  () => alert('Segment list updated.'),
  updatePanelList:    () => alert('Panel list updated.'),
  createLogicalSource:() => alert('Logical Source and Readers created.'),
}

function handleAction(_id: string, handler: string) {
  actions[handler]?.()
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <div class="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
      <button
        type="button"
        class="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 text-gray-500 transition cursor-pointer"
        title="Back to Home"
        @click="router.push('/')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-base font-semibold text-gray-800">{{ title }}</h1>

      <!-- Save result indicator -->
      <span
        v-if="saving"
        class="ml-auto text-xs text-blue-600 font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200"
      >
        Guardando...
      </span>
      <span
        v-else-if="saveResult === 'ok'"
        class="ml-auto text-xs text-green-600 font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-200"
      >
        Guardado correctamente
      </span>
      <span
        v-else-if="saveResult === 'error'"
        class="ml-auto text-xs text-red-600 font-medium px-2 py-0.5 rounded-full bg-red-50 border border-red-200"
      >
        Error al guardar
      </span>

      <!-- Load indicator -->
      <span
        v-else-if="dmValues && !apiError"
        class="ml-auto text-xs text-green-600 font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-200"
      >
        Loaded from service
      </span>
      <span
        v-else-if="apiError"
        class="ml-auto text-xs text-amber-600 font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200"
        :title="apiError"
      >
        Using defaults
      </span>
    </div>

    <!-- States -->
    <div v-if="loading" class="flex flex-1 items-center justify-center text-gray-400 text-sm">
      Loading...
    </div>

    <div v-else-if="notFound" class="flex flex-1 items-center justify-center text-red-400 text-sm">
      Schema not found.
    </div>

    <FormRenderer
      v-else-if="schema"
      ref="formRenderer"
      :schema="schema"
      :initial-values="dmValues"
      class="flex-1 overflow-hidden"
      @action="handleAction"
    />

  </div>
</template>
