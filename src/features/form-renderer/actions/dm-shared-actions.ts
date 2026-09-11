// dm-shared-actions — the few actions COMMON to every Data Manager.
//
// Only three remain: `dm_shared_save` (Save), `dm_shared_setDefaults` (Defaults) and the generic
// `dm_shared_runAction`, which every button_bar button routes through to hit its declared `action`
// (verb + URL) REST endpoint. Sync/activity/etc. buttons are plain REST `action`s now — there are no
// per-operation onClick handlers here anymore.
// Naming convention: every exported function is `dm_shared_{fn}`, matching the onClick used by the
// two special action-bar buttons (Save/Defaults). Buttons in the schema use `action`, not `onClick`.

import { useDialog }           from '../composables/useDialog'
import type { ActionContext }  from './action-context'

export type { ActionContext, ActionFn } from './action-context'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Serialize form state → request body. Fully DM-AGNOSTIC (no per-DM branches):
//  • drop transient UI-only keys (prefixed with "_") so they are never persisted as DM settings;
//  • customFields controls hold a KeyValuePair[] (until edited, then already an object) — persist any
//    array-valued key as a { key: value } object, the shape the service expects. The ONLY array-valued
//    keys in form state are customFields, so this is detected by SHAPE, not by DM/key name.
// JSON-string fields (table / custom_sync / site_timezones) are sent as-is; the service/DM parses the
// string itself (e.g. Genetec reads rio_list only "If TypeOf ... Is String").
function serializeState(state: Record<string, any>): Record<string, any> {
  const body: Record<string, any> = { ...state }
  for (const key of Object.keys(body)) {
    if (key.startsWith('_')) { delete body[key]; continue }
    const v = body[key]
    if (Array.isArray(v)) body[key] = Object.fromEntries(v.map((r: any) => [r?.key, r?.value]))
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
//   state: Record<string, any>,
// ): Promise<{ ok: boolean; message: string }> {
//   try {
//     const res = await fetch(`${serviceBase}/api/data-managers/${guid}/test-connection`, {
//       method:  'POST',
//       headers: JSON_HEADERS,
//       body:    JSON.stringify(serializeState(state)),
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

// Re-fetch the source/destination field lists of every customFields control on the page. Mirrors the
// WinForm "Load Genetec Custom Fields" button (LoadUDFs → re-pulls the live fields via GetTableDataFields).
// Generic — the customFields controls already auto-load on mount; this just triggers a manual refresh.
export function dm_shared_reloadCustomFields(): void {
  window.dispatchEvent(new CustomEvent('dm:reload-custom-fields'))
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function dm_shared_save({ guid, state, serviceBase }: ActionContext): Promise<void> {
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
      body: JSON.stringify(serializeState(state)),
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

  // Settings are persisted — Save no longer waits on / reports the connection test. It returns fast; the
  // connection is checked separately (POST test-connection) and shown in the toolbar's persistent status
  // indicator (FormRenderer re-checks it after each save). The "Saved successfully" toast is enough here.
}

// ─── Generic REST button ───────────────────────────────────────────────────────
// Runs a plain "verb + action URL" button (no dedicated handler): hits the URL the button declares in
// its schema (`action`, with {dmId} → guid) and reports the outcome. Used for every button that has an
// `action` instead of an `onClick` (OnGuard subscriptions/segments/panels/logical-source, the base
// maintenance buttons, etc.). ControlButtonBar passes { verb, action, title } as the payload.
export async function dm_shared_runAction({ guid, serviceBase, payload }: ActionContext): Promise<void> {
  const { show } = useDialog()
  const p = payload as { verb?: string; action?: string; title?: string; fireAndForget?: boolean; body?: unknown; refreshOnSuccess?: boolean } | undefined
  const title = p?.title ?? 'Action'
  if (!p?.action) return
  if (!guid) { show({ success: false, title, message: 'No GUID provided.' }); return }

  const url  = `${serviceBase}${p.action.replace(/\{dmId\}/g, guid)}`
  const verb = (p.verb || 'POST').toUpperCase()
  try {
    // Master-detail buttons carry a `body` (the selected row) → POST it as JSON.
    const init: RequestInit = { method: verb }
    if (p.body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' }
      init.body = JSON.stringify(p.body)
    }
    const res  = await fetch(url, init)
    const body = await res.json().catch(() => null)

    if (!res.ok) {
      const msg = body?.message ?? body?.Error ?? body?.error ?? `The service returned ${res.status}.`
      show({ success: false, title, message: oneLine(String(msg)) })
      return
    }

    // Fire-and-forget triggers (the "run now" sync buttons) return as soon as the op is queued — the
    // sync is still running, so DON'T claim it "Completed successfully". Progress is visible in the live
    // log and the active-sync indicator. Errors above are still surfaced.
    if (p.fireAndForget) return

    // Only actions that DECLARE they change server data (refreshOnSuccess) ask dynamic-option controls to
    // re-fetch — e.g. Genetec "Sync Doors" imports doors into XPE, so the doors MultiSelect refreshes;
    // "Update RIO" (writes to the device, not XPE) does NOT, so it doesn't trigger a needless reload.
    if (p.refreshOnSuccess)
      window.dispatchEvent(new CustomEvent('dm:data-changed'))

    const msg = body?.message ?? body?.Error ?? body?.error ?? 'Completed successfully.'
    show({ success: true, title, message: oneLine(String(msg)) })
  } catch {
    show({ success: false, title, message: 'Could not reach the service.' })
  }
}

