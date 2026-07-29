// Nedap AEOS-specific actions. Dispatched by the `aeos_` prefix (see useDmActions.ts).
import { useDialog }          from '../composables/useDialog'
import type { ActionContext } from './action-context'

/** Fetches a field list from the service and merges new keys into a keyvalue state field. */
async function loadFieldsInto(
  ctx: ActionContext,
  endpoint: string,
  stateField: string,
): Promise<void> {
  const { show } = useDialog()
  if (!ctx.guid) { show({ success: false, title: 'Load AEOS Fields', message: 'No GUID provided.' }); return }

  const res = await fetch(`${ctx.serviceBase}/api/data-managers/${ctx.guid}/${endpoint}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    show({ success: false, title: 'Load AEOS Fields', message: body?.Error ?? `Service returned ${res.status}` })
    return
  }

  const fields: string[] = await res.json()
  const existing: { key: string; value: string }[] = Array.isArray(ctx.state[stateField]) ? ctx.state[stateField] : []
  const existingKeys = new Set(existing.map((r) => r.key))
  const newRows = fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))
  ctx.state[stateField] = [...existing, ...newRows]
  show({
    success: true,
    title: 'Load AEOS Fields',
    message: newRows.length > 0 ? `Loaded ${newRows.length} new field(s).` : 'No new fields.',
  })
}

export function aeos_loadUserFields(ctx: ActionContext): Promise<void> {
  return loadFieldsInto(ctx, 'aeos/employee-fields', 'emp_fields')
}

export function aeos_loadVisitorFields(ctx: ActionContext): Promise<void> {
  return loadFieldsInto(ctx, 'aeos/visitor-fields', 'visitor_fields')
}

export function aeos_loadContractorFields(ctx: ActionContext): Promise<void> {
  return loadFieldsInto(ctx, 'aeos/contractor-fields', 'contractor_fields')
}
