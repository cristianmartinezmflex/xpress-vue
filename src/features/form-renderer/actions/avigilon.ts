// Avigilon ACM-specific actions. Dispatched by the `avigilon_` prefix (see useDmActions.ts).
import { useDialog }          from '../composables/useDialog'
import type { ActionContext } from './action-context'

export async function avigilon_loadFields({ guid, state, serviceBase }: ActionContext): Promise<void> {
  const { show } = useDialog()
  if (!guid) { show({ success: false, title: 'Load ACM Fields', message: 'No GUID provided.' }); return }

  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/avigilon/identity-fields`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    show({ success: false, title: 'Load ACM Fields', message: body?.Error ?? `Service returned ${res.status}` })
    return
  }

  const fields: string[] = await res.json()
  const existing: { key: string; value: string }[] = Array.isArray(state['CustomFields']) ? state['CustomFields'] : []
  const existingKeys = new Set(existing.map((r) => r.key))
  const newRows = fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))
  state['CustomFields'] = [...existing, ...newRows]
  show({
    success: true,
    title: 'Load ACM Fields',
    message: newRows.length > 0
      ? `Se cargaron ${newRows.length} campo(s) nuevo(s) desde Avigilon ACM.`
      : 'No hay nuevos campos (todos ya están mapeados).',
  })
}
