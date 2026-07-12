<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormRenderer from '@/features/form-renderer/components/FormRenderer.vue'
import DialogMessage    from '@/features/form-renderer/components/DialogMessage.vue'
import CustomSyncDialog from '@/features/form-renderer/components/CustomSyncDialog.vue'
import type { FormSchema } from '@/features/form-renderer/types/schema'
import { useDmActions } from '@/features/form-renderer/composables/useDmActions'
import { useDialog }   from '@/features/form-renderer/composables/useDialog'

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
  'example':          () => import('@/data/example.json'),
  'galaxy-rest':      () => import('@/data/galaxy-rest.json'),
  'on-guard':         () => import('@/data/on-guard.json'),
  'cloud-identity':   () => import('@/data/cloud-identity.json'),
  'avigilon':         () => import('@/data/avigilon-acm.json'),
  'aeos':             () => import('@/data/aeos.json'),
  'genetec':          () => import('@/data/genetec.json'),
  'rs2-rest':         () => import('@/data/rs2-rest.json'),
}

const title = computed(() => {
  const map: Record<string, string> = {
    'example':        'Example',
    'galaxy-rest':    'Galaxy REST Data Manager',
    'on-guard':       'OnGuard Data Manager',
    'cloud-identity': 'Cloud Identity Sync (Demo)',
    'avigilon':       'Avigilon ACM Data Manager',
    'aeos':           'Nedap AEOS Data Manager',
    'genetec':        'Genetec Data Manager',
    'rs2-rest':       'RS2 REST Data Manager',
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

const { show: showDialog } = useDialog()

// ─── OnGuard-specific helpers ─────────────────────────────────────────────────

async function onGuardPost(subRoute: string, guid: string, body?: object) {
  const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${guid}/${subRoute}`, {
    method:  'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body:    body ? JSON.stringify(body) : undefined,
  })
  return res.json().catch(() => ({ success: false, message: `Service returned ${res.status}` }))
}

const { dispatch } = useDmActions(
  () => ({
    guid:             route.query.guid as string | undefined,
    state:            formRenderer.value?.state ?? {},
    serviceBase:      DM_SERVICE_BASE,
    schemaKey:        route.params.schema as string,
    customSyncTables: schema.value?.customSyncTables,
    navigate:         (path: string) => router.push(path),
  }),
  {
    // ── Shared client-side ─────────────────────────────────────────────────
    'setDefaults': () => {
      formRenderer.value?.resetToDefaults()
    },

    // ── OnGuard-specific ───────────────────────────────────────────────────
    'checkSubscriptions': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Check Subscriptions', message: 'No GUID provided.' }); return }
      const result = await onGuardPost('check-subscriptions', ctx.guid)
      const subs: string[] = result.data ?? []
      const detail = subs.length > 0 ? subs.join('\n') : 'No subscriptions found.'
      showDialog({ success: result.success, title: 'XPressEntry Subscriptions', message: result.message + (subs.length > 0 ? '\n\n' + detail : '') })
    },

    'deleteSubscription': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Delete Subscription', message: 'No GUID provided.' }); return }
      const desc = (ctx.state['subscription_description'] as string | undefined) ?? ''
      const result = await onGuardPost('delete-subscription', ctx.guid, { description: desc })
      showDialog({ success: result.success, title: 'Delete Subscription', message: result.message })
    },

    'updateSegmentList': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Update Segments', message: 'No GUID provided.' }); return }
      const result = await onGuardPost('update-segments', ctx.guid)
      showDialog({ success: result.success, title: 'Update Segment List', message: result.message })
    },

    'updatePanelList': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Update Panels', message: 'No GUID provided.' }); return }
      const result = await onGuardPost('update-panels', ctx.guid)
      showDialog({ success: result.success, title: 'Update Panel List', message: result.message })
    },

    'createLogicalSource': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Create Logical Source', message: 'No GUID provided.' }); return }
      const result = await onGuardPost('create-logical-source', ctx.guid)
      showDialog({ success: result.success, title: 'Create Logical Source & Readers', message: result.message })
    },

    // ── AEOS-specific ─────────────────────────────────────────────────────
    'loadAeosUserFields': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Load AEOS Fields', message: 'No GUID provided.' }); return }
      const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${ctx.guid}/aeos/employee-fields`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        showDialog({ success: false, title: 'Load AEOS Fields', message: body?.Error ?? `Service returned ${res.status}` })
        return
      }
      const fields: string[] = await res.json()
      const existing: { key: string; value: string }[] = ctx.state['emp_fields'] ?? []
      const existingKeys = new Set(existing.map((r) => r.key))
      const newRows = fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))
      ctx.state['emp_fields'] = [...existing, ...newRows]
      showDialog({ success: true, title: 'Load AEOS Fields', message: newRows.length > 0 ? `Se cargaron ${newRows.length} campo(s) nuevo(s).` : 'No hay nuevos campos.' })
    },

    'loadAeosVisitorFields': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Load AEOS Fields', message: 'No GUID provided.' }); return }
      const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${ctx.guid}/aeos/visitor-fields`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        showDialog({ success: false, title: 'Load AEOS Fields', message: body?.Error ?? `Service returned ${res.status}` })
        return
      }
      const fields: string[] = await res.json()
      const existing: { key: string; value: string }[] = ctx.state['visitor_fields'] ?? []
      const existingKeys = new Set(existing.map((r) => r.key))
      const newRows = fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))
      ctx.state['visitor_fields'] = [...existing, ...newRows]
      showDialog({ success: true, title: 'Load AEOS Fields', message: newRows.length > 0 ? `Se cargaron ${newRows.length} campo(s) nuevo(s).` : 'No hay nuevos campos.' })
    },

    'loadAeosContractorFields': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Load AEOS Fields', message: 'No GUID provided.' }); return }
      const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${ctx.guid}/aeos/contractor-fields`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        showDialog({ success: false, title: 'Load AEOS Fields', message: body?.Error ?? `Service returned ${res.status}` })
        return
      }
      const fields: string[] = await res.json()
      const existing: { key: string; value: string }[] = ctx.state['contractor_fields'] ?? []
      const existingKeys = new Set(existing.map((r) => r.key))
      const newRows = fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))
      ctx.state['contractor_fields'] = [...existing, ...newRows]
      showDialog({ success: true, title: 'Load AEOS Fields', message: newRows.length > 0 ? `Se cargaron ${newRows.length} campo(s) nuevo(s).` : 'No hay nuevos campos.' })
    },

    // ── Avigilon-specific ──────────────────────────────────────────────────
    'loadAvigilonFields': async (ctx) => {
      if (!ctx.guid) { showDialog({ success: false, title: 'Load ACM Fields', message: 'No GUID provided.' }); return }
      const res = await fetch(`${DM_SERVICE_BASE}/api/data-managers/${ctx.guid}/avigilon/identity-fields`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        showDialog({ success: false, title: 'Load ACM Fields', message: body?.Error ?? `Service returned ${res.status}` })
        return
      }
      const fields: string[] = await res.json()
      const existing: { key: string; value: string }[] = ctx.state['CustomFields'] ?? []
      const existingKeys = new Set(existing.map((r) => r.key))
      const newRows = fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))
      ctx.state['CustomFields'] = [...existing, ...newRows]
      const msg = newRows.length > 0
        ? `Se cargaron ${newRows.length} campo(s) nuevo(s) desde Avigilon ACM.`
        : 'No hay nuevos campos (todos ya están mapeados).'
      showDialog({ success: true, title: 'Load ACM Fields', message: msg })
    },
  },
)

async function handleAction(_id: string, handler: string) {
  saving.value     = true
  saveResult.value = null
  try {
    await dispatch(handler)
    saveResult.value = 'ok'
  } catch {
    saveResult.value = 'error'
  } finally {
    saving.value = false
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
      :guid="route.query.guid as string | undefined"
      :service-base="DM_SERVICE_BASE"
      class="flex-1 overflow-hidden"
      @action="handleAction"
    />

    <DialogMessage />
    <CustomSyncDialog />

  </div>
</template>
