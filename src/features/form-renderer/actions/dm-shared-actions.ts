// dm-shared-actions — actions COMMON to every Data Manager.
//
// Naming convention: every exported function is named `dm_shared_{fn}` and matches
// exactly the onClick value used in JSON schemas, e.g. onClick="dm_shared_runFullSync".
// Data-Manager-specific actions do NOT live here — they live in their own file
// (genetec.ts, on-guard.ts, …) and are dispatched by prefix (see useDmActions.ts).

import { useDialog }           from '../composables/useDialog'
import { useCustomSyncDialog } from '../composables/useCustomSyncDialog'
import type { ActionContext }  from './action-context'

export type { ActionContext, ActionFn } from './action-context'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Per-DM serialization of state → request body (keyvalue arrays → Hashtable objects, etc.).
// Kept here because it is applied uniformly by the shared save / test-connection actions.
function serializeState(schemaKey: string | undefined, state: Record<string, any>): Record<string, any> {
  const body: Record<string, any> = { ...state }
  // Drop transient UI-only keys (prefixed with "_", e.g. _onguard_panels, _rs2_sites_cache) so they
  // are never persisted as DM settings.
  for (const key of Object.keys(body)) if (key.startsWith('_')) delete body[key]
  const kvToObject = (field: string) => {
    if (Array.isArray(body[field])) {
      body[field] = Object.fromEntries(
        (body[field] as { key: string; value: string }[]).map((r) => [r.key, r.value]),
      )
    }
  }

  if (schemaKey === 'avigilon') kvToObject('CustomFields')

  if (schemaKey === 'aeos') {
    for (const field of ['emp_fields', 'visitor_fields', 'contractor_fields']) kvToObject(field)
  }

  if (schemaKey === 'rs2-rest') {
    kvToObject('custom_fields_users')
    if (typeof body['site_timezones'] === 'string' && body['site_timezones']) {
      try {
        const arr = JSON.parse(body['site_timezones']) as { siteId: string; timezone: string }[]
        if (Array.isArray(arr)) body['site_timezones'] = Object.fromEntries(arr.map((r) => [r.siteId, r.timezone]))
      } catch { /* leave as-is */ }
    }
  }

  if (schemaKey === 'genetec') {
    kvToObject('customFields')
    if (typeof body['rio_list'] === 'string' && body['rio_list']) {
      try { body['rio_list'] = JSON.parse(body['rio_list']) } catch { /* leave as-is */ }
    }
  }

  return body
}

// Collapse a multi-line service message into one line. Some DMs (e.g. OnGuard OpenAccess) put the
// generic text on the first line and the real diagnostic (HTTP status + error code) on the next.
function oneLine(raw: string): string {
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(' — ') || raw
}

// Kept for reference: the old standalone connection test (separate /test-connection endpoint), used
// before Save itself started testing the connection (SetSettings => GetStatus) and returning the
// result. Left commented in case a standalone test is needed again.
// async function checkConnection(
//   guid: string,
//   serviceBase: string | undefined,
//   schemaKey: string | undefined,
//   state: Record<string, any>,
// ): Promise<{ ok: boolean; message: string }> {
//   try {
//     const res = await fetch(`${serviceBase}/api/data-managers/${guid}/test-connection`, {
//       method:  'POST',
//       headers: JSON_HEADERS,
//       body:    JSON.stringify(serializeState(schemaKey, state)),
//     })
//     if (res.ok) return { ok: true, message: '' }
//     const result = await res.json().catch(() => null)
//     const raw: string = result?.Error ?? result?.error ?? `Service returned ${res.status}.`
//     // Keep every non-empty line: some DMs (e.g. OnGuard OpenAccess) put the generic text on the
//     // first line and the real diagnostic (HTTP status + error code) on the next — don't drop it.
//     const message = oneLine(raw)
//     return { ok: false, message }
//   } catch {
//     return { ok: false, message: 'Could not reach the service.' }
//   }
// }

// ─── Client-side ───────────────────────────────────────────────────────────────

export function dm_shared_setDefaults({ resetToDefaults }: ActionContext): void {
  resetToDefaults?.()
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function dm_shared_save({ guid, state, serviceBase, schemaKey }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot save.'); return }

  const { show } = useDialog()

  // Save is the single action: the service stops active operations, persists the settings, applies
  // them (SetSettings) and runs GetStatus — then returns the outcome in `connection_result`. There is
  // no separate Test Connect step anymore.
  let res: Response
  try {
    res = await fetch(`${serviceBase}/api/data-managers/${guid}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(serializeState(schemaKey, state)),
    })
  } catch {
    show({ success: false, title: 'Save', message: 'Could not reach the service.' })
    return
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    const msg = err?.Error ?? err?.error ?? `The service returned ${res.status}.`
    show({ success: false, title: 'Save', message: oneLine(String(msg)) })
    return
  }

  // Settings are persisted. A dialog is ONLY shown when the connection test actually FAILED.
  // - success  → no dialog (the top-right "Saved successfully" toast in FormView is enough).
  // - pending  → no dialog either: the test just didn't finish within the service timeout and is still
  //              running in the background (some DMs, e.g. OnGuard, take >60s on first apply). Not an error.
  // - failed   → red error dialog with the detail.
  const saved = await res.json().catch(() => null)
  const cr = saved?.connection_result

  if (cr && cr.success === false && !cr.pending) {
    const detail = cr.message ? `\n\n${oneLine(String(cr.message))}` : ''
    show({ success: false, title: 'Saved — Connection Failed', message: `Settings saved, but the connection test failed.${detail}` })
  }
}

// ─── Generic REST button ───────────────────────────────────────────────────────
// Runs a plain "verb + action URL" button (no dedicated handler): hits the URL the button declares in
// its schema (`action`, with {dmId} → guid) and reports the outcome. Used for every button that has an
// `action` instead of an `onClick` (OnGuard subscriptions/segments/panels/logical-source, the base
// maintenance buttons, etc.). ControlButtonBar passes { verb, action, title } as the payload.
export async function dm_shared_runAction({ guid, serviceBase, payload }: ActionContext): Promise<void> {
  const { show } = useDialog()
  const p = payload as { verb?: string; action?: string; title?: string } | undefined
  const title = p?.title ?? 'Action'
  if (!p?.action) return
  if (!guid) { show({ success: false, title, message: 'No GUID provided.' }); return }

  const url  = `${serviceBase}${p.action.replace(/\{dmId\}/g, guid)}`
  const verb = (p.verb || 'POST').toUpperCase()
  try {
    const res  = await fetch(url, { method: verb })
    const body = await res.json().catch(() => null)
    const msg  = body?.message ?? body?.Error ?? body?.error ??
      (res.ok ? 'Completed successfully.' : `The service returned ${res.status}.`)
    show({ success: res.ok, title, message: oneLine(String(msg)) })
  } catch {
    show({ success: false, title, message: 'Could not reach the service.' })
  }
}

// ─── Sync (fire & forget) ─────────────────────────────────────────────────────

export async function dm_shared_runFullSync({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync?syncType=FULL_SYNC`, { method: 'POST' })
  if (!res.ok) alert(`Error starting full sync: the service returned ${res.status}`)
}

export async function dm_shared_runPartialSync({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync?syncType=PARTIAL_SYNC`, { method: 'POST' })
  if (!res.ok) alert(`Error starting partial sync: the service returned ${res.status}`)
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
    if (!res.ok) alert(`Error starting custom sync: the service returned ${res.status}`)
  }, customSyncTables)
}

// ─── Sync (wait for result) ───────────────────────────────────────────────────

export async function dm_shared_runFullSyncForResult({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync-for-result?syncType=FULL_SYNC`, { method: 'POST' })
  if (!res.ok) {
    const result = await res.json().catch(() => null)
    alert(`Sync failed: ${result?.Error ?? `The service returned ${res.status}`}`)
  }
}

export async function dm_shared_runPartialSyncForResult({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot run sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/run-sync-for-result?syncType=PARTIAL_SYNC`, { method: 'POST' })
  if (!res.ok) {
    const result = await res.json().catch(() => null)
    alert(`Sync failed: ${result?.Error ?? `The service returned ${res.status}`}`)
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function dm_shared_getSyncStatus({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot get sync status.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/sync-status`)
  if (!res.ok) { alert(`Error getting status: the service returned ${res.status}`); return }
  const result = await res.json()
  alert(`Sync status: ${JSON.stringify(result, null, 2)}`)
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function dm_shared_cancelSync({ guid, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided — cannot cancel sync.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/cancel-sync?syncType=FULL_SYNC`, { method: 'POST' })
  if (!res.ok) alert(`Error canceling sync: the service returned ${res.status}`)
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export function dm_shared_setupDataManager({ guid, schemaKey, navigate }: ActionContext): void {
  if (!guid || !schemaKey) return
  const path = `/form/${schemaKey}?guid=${guid}`
  if (navigate) navigate(path)
  else window.location.href = path
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
  if (!res.ok) alert(`Error in activity sync: the service returned ${res.status}`)
}
