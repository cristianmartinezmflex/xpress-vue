// OnGuard-specific actions. Dispatched by the `onguard_` prefix (see useDmActions.ts).
import { useDialog }          from '../composables/useDialog'
import type { ActionContext } from './action-context'

async function onGuardPost(serviceBase: string, guid: string, subRoute: string, body?: object) {
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/${subRoute}`, {
    method:  'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body:    body ? JSON.stringify(body) : undefined,
  })
  return res.json().catch(() => ({ success: false, message: `Service returned ${res.status}` }))
}

export async function onguard_checkSubscriptions({ guid, serviceBase }: ActionContext): Promise<void> {
  const { show } = useDialog()
  if (!guid) { show({ success: false, title: 'Check Subscriptions', message: 'No GUID provided.' }); return }
  const result = await onGuardPost(serviceBase, guid, 'check-subscriptions')
  const subs: string[] = result.data ?? []
  const detail = subs.length > 0 ? subs.join('\n') : 'No subscriptions found.'
  show({ success: result.success, title: 'XPressEntry Subscriptions', message: result.message + (subs.length > 0 ? '\n\n' + detail : '') })
}

export async function onguard_deleteSubscription({ guid, state, serviceBase }: ActionContext): Promise<void> {
  const { show } = useDialog()
  if (!guid) { show({ success: false, title: 'Delete Subscription', message: 'No GUID provided.' }); return }
  const desc = (state['subscription_description'] as string | undefined) ?? ''
  const result = await onGuardPost(serviceBase, guid, 'delete-subscription', { description: desc })
  show({ success: result.success, title: 'Delete Subscription', message: result.message })
}

export async function onguard_updateSegmentList({ guid, serviceBase }: ActionContext): Promise<void> {
  const { show } = useDialog()
  if (!guid) { show({ success: false, title: 'Update Segments', message: 'No GUID provided.' }); return }
  const result = await onGuardPost(serviceBase, guid, 'update-segments')
  show({ success: result.success, title: 'Update Segment List', message: result.message })
}

export async function onguard_updatePanelList({ guid, serviceBase }: ActionContext): Promise<void> {
  const { show } = useDialog()
  if (!guid) { show({ success: false, title: 'Update Panels', message: 'No GUID provided.' }); return }
  const result = await onGuardPost(serviceBase, guid, 'update-panels')
  show({ success: result.success, title: 'Update Panel List', message: result.message })
}

export async function onguard_createLogicalSource({ guid, serviceBase }: ActionContext): Promise<void> {
  const { show } = useDialog()
  if (!guid) { show({ success: false, title: 'Create Logical Source', message: 'No GUID provided.' }); return }
  const result = await onGuardPost(serviceBase, guid, 'create-logical-source')
  show({ success: result.success, title: 'Create Logical Source & Readers', message: result.message })
}
