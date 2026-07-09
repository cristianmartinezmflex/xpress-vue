// DmSharedFunctions — shared actions common to all Data Managers.
//
// Naming convention: every exported function name matches exactly the onClick
// value used in JSON schemas. e.g. click="dm_shared_runFullSync" → dm_shared_runFullSync()
//
// To add a new shared action: export a new async function following the same pattern.

import { useDialog }           from '../composables/useDialog'
import { useCustomSyncDialog } from '../composables/useCustomSyncDialog'

export interface ActionContext {
  guid:              string | undefined
  state:             Record<string, any>
  serviceBase:       string
  schemaKey?:        string
  customSyncTables?: string[]
  navigate?:         (path: string) => void
}

export type ActionFn = (ctx: ActionContext) => void | Promise<void>

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function dm_shared_save({ guid, state, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot save.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(state),
  })
  if (!res.ok) alert(`Error al guardar: el servicio devolvió ${res.status}`)
}

// ─── Sync (fire & forget) ─────────────────────────────────────────────────────

export async function dm_shared_runFullSync({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync?syncType=FULL_SYNC`, {
    method: 'POST',
  })
  if (!res.ok) alert(`Error al iniciar full sync: el servicio devolvió ${res.status}`)
}

export async function dm_shared_runPartialSync({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync?syncType=PARTIAL_SYNC`, {
    method: 'POST',
  })
  if (!res.ok) alert(`Error al iniciar partial sync: el servicio devolvió ${res.status}`)
}

export function dm_shared_runCustomSync({ guid, state, serviceBase, customSyncTables }: ActionContext): void {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const currentJson = state['custom_sync_settings'] as string | undefined
  useCustomSyncDialog().show(currentJson, async (tables) => {
    state['custom_sync_settings'] = JSON.stringify(tables)
    const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync?syncType=CUSTOM_SYNC`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(tables),
    })
    if (!res.ok) alert(`Error al iniciar custom sync: el servicio devolvió ${res.status}`)
  }, customSyncTables)
}

// ─── Sync (wait for result) ───────────────────────────────────────────────────

export async function dm_shared_runFullSyncForResult({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync-for-result?syncType=FULL_SYNC`, {
    method: 'POST',
  })
  if (!res.ok) {
    const result = await res.json().catch(() => null)
    alert(`Sync falló: ${result?.Error ?? `El servicio devolvió ${res.status}`}`)
  }
}

export async function dm_shared_runPartialSyncForResult({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync-for-result?syncType=PARTIAL_SYNC`, {
    method: 'POST',
  })
  if (!res.ok) {
    const result = await res.json().catch(() => null)
    alert(`Sync falló: ${result?.Error ?? `El servicio devolvió ${res.status}`}`)
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function dm_shared_getSyncStatus({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot get sync status.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/sync-status`)
  if (!res.ok) { alert(`Error obteniendo status: el servicio devolvió ${res.status}`); return }
  const result = await res.json()
  alert(`Sync status: ${JSON.stringify(result, null, 2)}`)
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function dm_shared_cancelSync({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot cancel sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/cancel-sync?syncType=FULL_SYNC`, {
    method: 'POST',
  })
  if (!res.ok) alert(`Error al cancelar sync: el servicio devolvió ${res.status}`)
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export function dm_shared_setupDataManager({ guid, schemaKey, navigate }: ActionContext): void {
  if (!guid || !schemaKey) return
  const path = `/form/${schemaKey}?guid=${guid}`
  if (navigate) navigate(path)
  else window.location.href = path
}

// ─── Test Connection ──────────────────────────────────────────────────────────

export async function dm_shared_testConnection({ guid, state, serviceBase }: ActionContext): Promise<void> {
  const { show } = useDialog()

  if (!guid) {
    show({ success: false, title: 'Test Connection', message: 'No GUID provided — cannot test connection.' })
    return
  }

  const res    = await fetch(`${serviceBase}/api/data-managers/${guid}/test-connection`, {
    method:  'POST',
    headers: JSON_HEADERS,
    body:    JSON.stringify(state),
  })
  const result = await res.json().catch(() => null)

  if (res.ok) {
    show({
      success: true,
      title:   'Test Connection',
      message: 'Connection successful.',
    })
  } else {
    show({
      success: false,
      title:   'Test Connection',
      message: result?.Error ?? `Service returned ${res.status}.`,
    })
  }
}

// ─── Custom Sync Editor ──────────────────────────────────────────────────────

export function dm_shared_editCustomSync({ guid, state, serviceBase, customSyncTables }: ActionContext): void {
  const currentJson = state['custom_sync_settings'] as string | undefined
  useCustomSyncDialog().show(currentJson, async (tables) => {
    const json = JSON.stringify(tables)
    state['custom_sync_settings'] = json
    if (guid) {
      await fetch(`${serviceBase}/api/data-managers/${guid}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify(state),
      })
    }
  }, customSyncTables)
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function dm_shared_sendActivitySync({ serviceBase }: ActionContext): Promise<void> {
  const res = await fetch(`${serviceBase}/api/data-managers/send-activity-sync`, { method: 'POST' })
  if (!res.ok) alert(`Error en activity sync: el servicio devolvió ${res.status}`)
}
