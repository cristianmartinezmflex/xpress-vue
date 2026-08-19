<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormRenderer from '@/features/form-renderer/components/FormRenderer.vue'
import DialogMessage    from '@/features/form-renderer/components/DialogMessage.vue'
import CustomSyncDialog from '@/features/form-renderer/components/CustomSyncDialog.vue'
import type { FormSchema } from '@/features/form-renderer/types/schema'
import { useDmActions } from '@/features/form-renderer/composables/useDmActions'

const DM_SERVICE_BASE = 'http://localhost:30011'

const route  = useRoute()
const router = useRouter()

const schema       = ref<FormSchema | null>(null)
const loading      = ref(true)
const notFound     = ref(false)
const dmValues     = ref<Record<string, any> | undefined>(undefined)
const apiError     = ref<string | null>(null)
const saving       = ref(false)
const activeAction = ref<string | null>(null)
// Id of the button whose action is currently in-flight, so that exact button (not just Save) can
// show a spinner and disable itself until the API call resolves.
const activeActionId = ref<string | null>(null)
const saveResult   = ref<'ok' | 'error' | null>(null)
const formRenderer = ref<InstanceType<typeof FormRenderer> | null>(null)

// Auto-discover every schema in src/data by filename — no manual registration needed.
// Route key === filename without extension (e.g. /form/genetec → data/genetec.json).
const schemaModules = import.meta.glob<{ default: FormSchema }>('@/data/*.json')
const schemaByKey: Record<string, () => Promise<{ default: FormSchema }>> = {}
for (const path in schemaModules) {
  const key = path.split('/').pop()!.replace(/\.json$/, '')
  schemaByKey[key] = schemaModules[path]
}

function prettifyKey(key: string): string {
  return key.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const title = computed(() =>
  schema.value?.title ?? prettifyKey((route.params.schema as string) ?? 'Form'),
)

async function loadSchema(key: string) {
  loading.value  = true
  notFound.value = false
  schema.value   = null
  dmValues.value = undefined
  apiError.value = null

  const guid = route.query.guid as string | undefined

  // These DMs load their FormSchema from the service — the JSON is generated at build time from
  // <DM>Settings + layouts and embedded in the plugin DLL, served by
  // GET /api/data-managers/{guid}/settings-schema. Every other DM keeps using its static
  // src/data/<key>.json for now. Falls back to the static schema if the endpoint is unavailable.
  // Compared case-insensitively because the route key is the ./data filename (e.g. "ONGUARD").
  const SERVICE_SCHEMA_KEYS = new Set(['genetec', 'onguard'])

  let schemaFromService = false
  if (guid && SERVICE_SCHEMA_KEYS.has(key.toLowerCase())) {
    try {
      const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${guid}/settings-schema`)
      if (res.ok) {
        schema.value      = await res.json() as FormSchema
        schemaFromService = true
      } else {
        apiError.value = `settings-schema returned ${res.status} — falling back to static schema`
      }
    } catch {
      apiError.value = `Could not reach settings-schema endpoint — falling back to static schema`
    }
  }

  if (!schemaFromService) {
    const loader = schemaByKey[key]
    if (!loader) { notFound.value = true; loading.value = false; return }
    const mod    = await loader()
    schema.value = mod.default as FormSchema
  }

  // If a DM GUID is provided as query param, fetch saved values from the service.
  // URL format: /form/on-guard?guid=<dm-guid>
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

// The view stays generic: it only wires the runtime context (form state, guid, service base,
// navigation, reset-to-defaults) and delegates every onClick to the prefix-based dispatcher.
// All Data-Manager-specific behavior lives in actions/<dm>.ts.
const { dispatch } = useDmActions(() => ({
  guid:             route.query.guid as string | undefined,
  state:            formRenderer.value?.state ?? {},
  serviceBase:      DM_SERVICE_BASE,
  schemaKey:        route.params.schema as string,
  customSyncTables: schema.value?.customSyncTables,
  navigate:         (path: string) => router.push(path),
  resetToDefaults:  () => formRenderer.value?.resetToDefaults(),
}))

async function handleAction(id: string, handler: string, payload?: unknown) {
  saving.value         = true
  activeAction.value   = handler
  activeActionId.value = id
  saveResult.value     = null
  try {
    await dispatch(handler, payload)
    saveResult.value = 'ok'
    // After a successful save the current values become the new baseline, so Save disables again
    // until the user changes something.
    if (handler === 'dm_shared_save') formRenderer.value?.markPristine()
  } catch {
    saveResult.value = 'error'
  } finally {
    saving.value         = false
    activeAction.value   = null
    activeActionId.value = null
    setTimeout(() => { saveResult.value = null }, 3000)
  }
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <div class="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
      <button
        type="button"
        class="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer"
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
        class="ml-auto text-xs text-xp-primary font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-xp-primary/30"
      >
        Saving...
      </span>
      <span
        v-else-if="saveResult === 'ok'"
        class="ml-auto text-xs text-xp-success font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-200"
      >
        Saved successfully
      </span>
      <span
        v-else-if="saveResult === 'error'"
        class="ml-auto text-xs text-xp-red font-medium px-2 py-0.5 rounded-full bg-red-50 border border-red-200"
      >
        Error saving
      </span>

      <!-- Load indicator -->
      <span
        v-else-if="dmValues && !apiError"
        class="ml-auto text-xs text-xp-success font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-200"
      >
        Loaded from service
      </span>
      <span
        v-else-if="apiError"
        class="ml-auto text-xs text-xp-orange font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200"
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
      :guid="route.query.guid as string | undefined"
      :service-base="DM_SERVICE_BASE"
      :active-action="activeAction"
      :active-action-id="activeActionId"
      class="flex-1 overflow-hidden"
      @action="handleAction"
    />

    <DialogMessage />
    <CustomSyncDialog />

  </div>
</template>
