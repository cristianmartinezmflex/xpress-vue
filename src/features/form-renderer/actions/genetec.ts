// Genetec-specific actions. Dispatched by the `genetec_` prefix (see useDmActions.ts).
import { useDialog }          from '../composables/useDialog'
import type { ActionContext } from './action-context'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Shape of a CloudLink (RIO) device, passed as the action payload by ControlRioDevices.
interface RioDevice {
  server:              string
  username:            string
  password:            string
  acceptUntrustedCert: boolean
  doorList?:           string
  allDoorsOnline?:     boolean
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

export async function genetec_loadCustomFields({ guid, state, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/genetec/cardholder-fields`)
  if (!res.ok) { alert(`Error loading fields: ${res.status}`); return }
  const fields: string[] = await res.json()
  const existing: { key: string; value: string }[] = Array.isArray(state['customFields']) ? state['customFields'] : []
  const existingKeys = new Set(existing.map((r) => r.key))
  state['customFields'] = [...existing, ...fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))]
}

// ─── CloudLink (RIO) per-device actions ─────────────────────────────────────────
// Dispatched from the per-device buttons declared in genetec.json's rio_devices control.
// The specific device is delivered as ctx.payload by ControlRioDevices.

export async function genetec_pingRio({ guid, serviceBase, payload }: ActionContext): Promise<void> {
  const { show } = useDialog()
  const device = payload as RioDevice | undefined
  if (!guid)   { show({ success: false, title: 'Ping RIO', message: 'No GUID provided.' }); return }
  if (!device) { show({ success: false, title: 'Ping RIO', message: 'No device selected.' }); return }

  try {
    const res = await fetch(`${serviceBase}/api/data-managers/${guid}/genetec/ping-rio`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        server: device.server,
        username: device.username,
        password: device.password,
        acceptUntrustedCert: device.acceptUntrustedCert,
      }),
    })
    const data = await res.json().catch(() => null)
    show({ success: res.ok, title: 'Ping RIO', message: res.ok ? 'Ping OK' : (data?.Error ?? `HTTP ${res.status}`) })
  } catch {
    show({ success: false, title: 'Ping RIO', message: 'Connection failed' })
  }
}

export async function genetec_updateRio({ guid, serviceBase, payload }: ActionContext): Promise<void> {
  const { show } = useDialog()
  const device = payload as RioDevice | undefined
  if (!guid)   { show({ success: false, title: 'Update RIO Readers', message: 'No GUID provided.' }); return }
  if (!device) { show({ success: false, title: 'Update RIO Readers', message: 'No device selected.' }); return }

  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/genetec/update-rio`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      server: device.server,
      username: device.username,
      password: device.password,
      acceptUntrustedCert: device.acceptUntrustedCert,
      doorList: device.doorList,
      allDoorsOnline: device.allDoorsOnline,
    }),
  })
  if (res.ok) {
    show({ success: true, title: 'Update RIO Readers', message: 'RIO update complete.' })
  } else {
    const data = await res.json().catch(() => null)
    show({ success: false, title: 'Update RIO Readers', message: `RIO update failed: ${data?.Error ?? `HTTP ${res.status}`}` })
  }
}
