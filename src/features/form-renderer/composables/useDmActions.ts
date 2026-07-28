// useDmActions — resolves a JSON `onClick` handler name to its implementation and runs it.
//
// Resolution is BY PREFIX:
//   "dm_shared_{fn}"  → dm-shared-actions.ts  (actions shared by every Data Manager)
//   "{dm}_{fn}"       → the per-DM module registered under "{dm}" below
//                       e.g. "genetec_syncDoors" → genetec.ts, "onguard_updatePanelList" → on-guard.ts
//
// To add actions for a new Data Manager: create actions/<dm>.ts with `<prefix>_` functions
// and register the module under its prefix in DM_ACTION_MODULES. Nothing else changes —
// the view and FormRenderer stay generic.

import * as shared    from '../actions/dm-shared-actions'
import * as genetec   from '../actions/genetec'
import * as onguard   from '../actions/on-guard'
import * as aeos      from '../actions/aeos'
import * as avigilon  from '../actions/avigilon'
import * as rs2       from '../actions/rs2-rest'
import type { ActionContext, ActionFn } from '../actions/action-context'

export type { ActionContext, ActionFn }

const SHARED_PREFIX = 'dm_shared_'

// prefix (the token before the first "_" in the handler name) → action module
const DM_ACTION_MODULES: Record<string, Record<string, unknown>> = {
  genetec,
  onguard,
  aeos,
  avigilon,
  rs2,
}

function resolve(handler: string): ActionFn | undefined {
  if (handler.startsWith(SHARED_PREFIX)) {
    return (shared as Record<string, unknown>)[handler] as ActionFn | undefined
  }
  const prefix = handler.slice(0, handler.indexOf('_'))
  const mod = DM_ACTION_MODULES[prefix]
  return mod ? (mod[handler] as ActionFn | undefined) : undefined
}

export function useDmActions(getContext: () => ActionContext) {
  async function dispatch(handler: string, payload?: unknown): Promise<void> {
    const fn = resolve(handler)
    if (!fn) {
      console.warn(`[useDmActions] No action found for "${handler}". Add it to dm-shared-actions.ts (dm_shared_*) or the matching per-DM module.`)
      return
    }
    await fn({ ...getContext(), payload })
  }

  return { dispatch }
}
