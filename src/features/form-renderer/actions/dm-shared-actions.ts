// DmSharedFunctions — shared actions common to all Data Managers.
//
// Naming convention: every exported function name matches exactly the onClick
// value used in JSON schemas. e.g. click="dm_shared_runFullSync" → dm_shared_runFullSync()
//
// To add a new shared action: export a new async function following the same pattern.

import { useDialog } from '../composables/useDialog'

export interface ActionContext {
  guid:        string | undefined
  state:       Record<string, any>
  serviceBase: string
  schemaKey?:  string
  navigate?:   (path: string) => void
}

export type ActionFn = (ctx: ActionContext) => void | Promise<void>

// ─── Internal helpers ─────────────────────────────────────────────────────────

function syncBody(guid: string | undefined, syncType: string): string {
  return JSON.stringify({ dmGuid: guid ?? null, syncType })
}

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
  const res = await fetch(`${serviceBase}/api/data-managers/sync`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: syncBody(guid, 'FULL_SYNC'),
  })
  if (!res.ok) alert(`Error al iniciar full sync: el servicio devolvió ${res.status}`)
}

export async function dm_shared_runPartialSync({ guid, serviceBase }: ActionContext): Promise<void> {
  const res = await fetch(`${serviceBase}/api/data-managers/sync`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: syncBody(guid, 'PARTIAL_SYNC'),
  })
  if (!res.ok) alert(`Error al iniciar partial sync: el servicio devolvió ${res.status}`)
}

export async function dm_shared_runCustomSync({ guid, serviceBase }: ActionContext): Promise<void> {
  const res = await fetch(`${serviceBase}/api/data-managers/sync`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: syncBody(guid, 'CUSTOM_SYNC'),
  })
  if (!res.ok) alert(`Error al iniciar custom sync: el servicio devolvió ${res.status}`)
}

// ─── Sync (wait for result) ───────────────────────────────────────────────────

export async function dm_shared_runFullSyncForResult({ guid, serviceBase }: ActionContext): Promise<void> {
  const res = await fetch(`${serviceBase}/api/data-managers/sync-result`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: syncBody(guid, 'FULL_SYNC'),
  })
  if (!res.ok) { alert(`Error en full sync: el servicio devolvió ${res.status}`); return }
  const result = await res.json()
  if (result?.success === false) alert(`Sync falló: ${result?.error ?? 'Error desconocido'}`)
}

export async function dm_shared_runPartialSyncForResult({ guid, serviceBase }: ActionContext): Promise<void> {
  const res = await fetch(`${serviceBase}/api/data-managers/sync-result`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: syncBody(guid, 'PARTIAL_SYNC'),
  })
  if (!res.ok) { alert(`Error en partial sync: el servicio devolvió ${res.status}`); return }
  const result = await res.json()
  if (result?.success === false) alert(`Sync falló: ${result?.error ?? 'Error desconocido'}`)
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
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/cancel-sync`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: syncBody(guid, 'FULL_SYNC'),
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

  const res    = await fetch(`${serviceBase}/api/data-managers/${guid}/status`, {
    method:  'POST',
    headers: JSON_HEADERS,
    body:    JSON.stringify(state),
  })
  const result = await res.json().catch(() => null)

  if (result?.success) {
    show({
      success: true,
      title:   'Test Connection',
      message: result.message ? result.message : 'Connection successful.',
    })
  } else {
    show({
      success: false,
      title:   'Test Connection',
      message: result?.error ?? `Service returned ${res.status}.`,
    })
  }
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function dm_shared_sendActivitySync({ serviceBase }: ActionContext): Promise<void> {
  const res = await fetch(`${serviceBase}/api/sync/activity`, { method: 'POST' })
  if (!res.ok) alert(`Error en activity sync: el servicio devolvió ${res.status}`)
}
