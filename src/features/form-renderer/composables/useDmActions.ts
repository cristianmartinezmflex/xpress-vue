import * as DmSharedFunctions from '../actions/dm-shared-actions'
import type { ActionContext, ActionFn } from '../actions/dm-shared-actions'

export type { ActionContext, ActionFn }

// onClick naming convention in JSON:
//   "dm_shared_{fn}"   → calls dm_shared_{fn} from dm-shared-actions.ts (shared, implemented by us)
//   "dm_{DmType}_{fn}" → calls the function from the DM-specific map provided by the view

export function useDmActions(
  getContext: () => ActionContext,
  dmSpecificActions: Record<string, ActionFn> = {},
) {
  async function dispatch(handler: string): Promise<void> {
    const ctx = getContext()

    // Check dm-shared-actions.ts for any handler (dm_shared_* or dm-type-specific like genetec_*)
    const sharedFn = (DmSharedFunctions as Record<string, ActionFn>)[handler]
    if (sharedFn) { await sharedFn(ctx); return }

    const fn = dmSpecificActions[handler]
    if (fn) { await fn(ctx); return }

    console.warn(`[useDmActions] No action found for "${handler}". For DM-specific actions, register it in the view's dmSpecificActions map.`)
  }

  return { dispatch }
}
