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

export async function dm_shared_save({ guid, state, serviceBase, schemaKey }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot save.'); return }

  const body: Record<string, any> = { ...state }

  // Avigilon: CustomFields keyvalue array → plain object (Hashtable)
  if (schemaKey === 'avigilon' && Array.isArray(body['CustomFields'])) {
    body['CustomFields'] = Object.fromEntries(
      (body['CustomFields'] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
    )
  }

  // AEOS: keyvalue arrays → plain objects (Hashtable)
  if (schemaKey === 'aeos') {
    for (const field of ['emp_fields', 'visitor_fields', 'contractor_fields']) {
      if (Array.isArray(body[field])) {
        body[field] = Object.fromEntries(
          (body[field] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
        )
      }
    }
  }

  // RS2 REST: custom_fields_users keyvalue array → plain object, site_timezones array → plain object
  if (schemaKey === 'rs2-rest') {
    if (Array.isArray(body['custom_fields_users'])) {
      body['custom_fields_users'] = Object.fromEntries(
        (body['custom_fields_users'] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
      )
    }
    if (typeof body['site_timezones'] === 'string' && body['site_timezones']) {
      try {
        const arr = JSON.parse(body['site_timezones']) as { siteId: string; timezone: string }[]
        if (Array.isArray(arr)) {
          body['site_timezones'] = Object.fromEntries(arr.map((r) => [r.siteId, r.timezone]))
        }
      } catch { /* leave as-is */ }
    }
  }

  // Genetec: customFields keyvalue array → plain object (Hashtable), rio_list JSON string → array
  if (schemaKey === 'genetec') {
    if (Array.isArray(body['customFields'])) {
      body['customFields'] = Object.fromEntries(
        (body['customFields'] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
      )
    }
    if (typeof body['rio_list'] === 'string' && body['rio_list']) {
      try { body['rio_list'] = JSON.parse(body['rio_list']) } catch { /* leave as-is */ }
    }
  }

  const res = await fetch(`${serviceBase}/api/data-managers/${guid}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
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

export async function dm_shared_testConnection({ guid, state, serviceBase, schemaKey }: ActionContext): Promise<void> {
  const { show } = useDialog()

  if (!guid) {
    show({ success: false, title: 'Test Connection', message: 'No GUID provided — cannot test connection.' })
    return
  }

  const body: Record<string, any> = { ...state }
  if (schemaKey === 'avigilon' && Array.isArray(body['CustomFields'])) {
    body['CustomFields'] = Object.fromEntries(
      (body['CustomFields'] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
    )
  }
  if (schemaKey === 'aeos') {
    for (const field of ['emp_fields', 'visitor_fields', 'contractor_fields']) {
      if (Array.isArray(body[field])) {
        body[field] = Object.fromEntries(
          (body[field] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
        )
      }
    }
  }

  if (schemaKey === 'rs2-rest') {
    if (Array.isArray(body['custom_fields_users'])) {
      body['custom_fields_users'] = Object.fromEntries(
        (body['custom_fields_users'] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
      )
    }
    if (typeof body['site_timezones'] === 'string' && body['site_timezones']) {
      try {
        const arr = JSON.parse(body['site_timezones']) as { siteId: string; timezone: string }[]
        if (Array.isArray(arr)) {
          body['site_timezones'] = Object.fromEntries(arr.map((r) => [r.siteId, r.timezone]))
        }
      } catch { /* leave as-is */ }
    }
  }

  if (schemaKey === 'genetec') {
    if (Array.isArray(body['customFields'])) {
      body['customFields'] = Object.fromEntries(
        (body['customFields'] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
      )
    }
    if (typeof body['rio_list'] === 'string' && body['rio_list']) {
      try { body['rio_list'] = JSON.parse(body['rio_list']) } catch { /* leave as-is */ }
    }
  }

  const res    = await fetch(`${serviceBase}/api/data-managers/${guid}/test-connection`, {
    method:  'POST',
    headers: JSON_HEADERS,
    body:    JSON.stringify(body),
  })
  const result = await res.json().catch(() => null)

  if (res.ok) {
    show({
      success: true,
      title:   'Test Connection',
      message: 'Connection successful.',
    })
  } else {
    const raw: string = result?.Error ?? `Service returned ${res.status}.`
    // Show only the first meaningful line — avoid dumping a full stack trace.
    const message = raw.split(/\r?\n/).find((l) => l.trim().length > 0) ?? raw
    show({ success: false, title: 'Test Connection', message })
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

// ─── Genetec-specific actions ─────────────────────────────────────────────────

// ─── RS2 REST-specific actions ────────────────────────────────────────────────

export async function rs2_loadSites({ guid, state, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/rs2/sites`)
  if (!res.ok) { alert(`Error loading sites: HTTP ${res.status}`); return }
  const sites: { id: string; name: string }[] = await res.json()
  // Store loaded sites in a transient state key so ControlSiteTimezones can display names
  state['_rs2_sites_cache'] = JSON.stringify([{ id: '-1', name: 'All Sites' }, ...sites])
  alert(`Loaded ${sites.length} site(s) from RS2. Sites are now available in the Site Timezones dropdown.`)
}

export async function rs2_loadUserFields({ guid, state, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/rs2/user-fields`)
  if (!res.ok) { alert(`Error loading user fields: HTTP ${res.status}`); return }
  const fields: string[] = await res.json()
  const existing: { key: string; value: string }[] = Array.isArray(state['custom_fields_users'])
    ? state['custom_fields_users']
    : []
  const existingKeys = new Set(existing.map((r) => r.key))
  const merged = [...existing, ...fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))]
  state['custom_fields_users'] = merged
}

export async function genetec_loadCustomFields({ guid, state, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/genetec/cardholder-fields`)
  if (!res.ok) { alert(`Error loading fields: ${res.status}`); return }
  const fields: string[] = await res.json()
  const existing: { key: string; value: string }[] = Array.isArray(state['customFields']) ? state['customFields'] : []
  const existingKeys = new Set(existing.map((r) => r.key))
  const merged = [...existing, ...fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))]
  state['customFields'] = merged
}

export async function genetec_syncDoors({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/genetec/sync-doors`, { method: 'POST' })
  if (res.ok) {
    alert('Door sync started.')
  } else {
    const data = await res.json().catch(() => null)
    alert(`Sync doors failed: ${data?.Error ?? `HTTP ${res.status}`}`)
  }
}
