// Genetec-specific actions. Dispatched by the `genetec_` prefix (see useDmActions.ts).
import { useDialog }          from '../composables/useDialog'
import type { ActionContext } from './action-context'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Shape of a CloudLink (RIO) device, as emitted by ControlRioDevices (the whole row is passed as
// the action payload). Sent verbatim to the backend, which deserializes it into a RIODevice
// (Newtonsoft matches these camelCase keys to the PascalCase members case-insensitively).
interface RioDevice {
  id?:                 number
  name?:               string
  server:              string
  username:            string
  password:            string
  acceptUntrustedCert: boolean
  doorList?:           string
  allDoorsOnline?:     boolean
}

// Reads { success, message } from a dm-action response (200 even on logical failure), or the
// error body from a non-2xx (501 → { error }, 500 → { Error }).
async function readActionResult(res: Response): Promise<{ success: boolean; message: string }> {
  const data = await res.json().catch(() => null)
  if (!res.ok) return { success: false, message: data?.error ?? data?.Error ?? `HTTP ${res.status}` }
  return { success: data?.success ?? true, message: data?.message ?? '' }
}

export async function genetec_syncDoors({ guid, serviceBase }: ActionContext): Promise<void> {
  const { show } = useDialog()
  if (!guid) { show({ success: false, title: 'Sync Doors', message: 'No GUID provided.' }); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/dm-action?type=sync-doors`, { method: 'POST' })
  const { success, message } = await readActionResult(res)
  show({ success, title: 'Sync Doors', message: message || (success ? 'Door and reader update complete.' : 'Sync doors failed.') })
}

export async function genetec_loadCustomFields({ guid, state, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/dm-data?type=cardholder-fields`)
  if (!res.ok) { alert(`Error loading fields: ${res.status}`); return }
  const fields: string[] = await res.json()
  const existing: { key: string; value: string }[] = Array.isArray(state['customFields']) ? state['customFields'] : []
  const existingKeys = new Set(existing.map((r) => r.key))
  state['customFields'] = [...existing, ...fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))]
}

// ─── CloudLink (RIO) per-device actions ─────────────────────────────────────────
// Dispatched from the per-device buttons declared in genetec.json's rio_devices control.
// The specific device is delivered as ctx.payload by ControlRioDevices and sent as-is.

export async function genetec_pingRio({ guid, serviceBase, payload }: ActionContext): Promise<void> {
  const { show } = useDialog()
  const device = payload as RioDevice | undefined
  if (!guid)   { show({ success: false, title: 'Ping RIO', message: 'No GUID provided.' }); return }
  if (!device) { show({ success: false, title: 'Ping RIO', message: 'No device selected.' }); return }

  try {
    const res = await fetch(`${serviceBase}/api/data-managers/${guid}/dm-action?type=ping-rio`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(device),
    })
    const { success, message } = await readActionResult(res)
    show({ success, title: 'Ping RIO', message: message || (success ? 'Login successful' : 'Ping failed') })
  } catch {
    show({ success: false, title: 'Ping RIO', message: 'Connection failed' })
  }
}

export async function genetec_updateRio({ guid, serviceBase, payload }: ActionContext): Promise<void> {
  const { show } = useDialog()
  const device = payload as RioDevice | undefined
  if (!guid)   { show({ success: false, title: 'Update RIO Readers', message: 'No GUID provided.' }); return }
  if (!device) { show({ success: false, title: 'Update RIO Readers', message: 'No device selected.' }); return }

  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/dm-action?type=update-rio`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(device),
  })
  const { success, message } = await readActionResult(res)
  show({ success, title: 'Update RIO Readers', message: message || (success ? 'RIO update complete.' : 'RIO update failed.') })
}
