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

    if (handler.startsWith('dm_shared_')) {
      const fn = (DmSharedFunctions as Record<string, ActionFn>)[handler]
      if (fn) { await fn(ctx); return }
      console.warn(`[useDmActions] Shared function not found: "${handler}". Add it to dm-shared-actions.ts.`)
      return
    }

    const fn = dmSpecificActions[handler]
    if (fn) { await fn(ctx); return }

    console.warn(`[useDmActions] No action found for "${handler}". For DM-specific actions, register it in the view's dmSpecificActions map.`)
  }

  return { dispatch }
}
