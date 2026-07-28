// useDmActions — resolves a JSON `onClick` handler name to its implementation and runs it.
//
// Every action module in ../actions/*.ts is auto-registered: each exported function is keyed
// by its own name, which is exactly the `onClick` value used in the schema JSON. The naming
// convention stays prefix-based:
//   "dm_shared_{fn}" → dm-shared-actions.ts   (shared by every Data Manager)
//   "{dm}_{fn}"       → <dm>.ts                (that Data Manager's specific actions)
//
// To add actions for a new Data Manager, just drop a file in ../actions/ that exports
// `{prefix}_` functions — no registration needed here or anywhere else.

import type { ActionContext, ActionFn } from '../actions/action-context'

export type { ActionContext, ActionFn }

// Eagerly import every action module so their exported functions can be registered by name.
const actionModules = import.meta.glob<Record<string, unknown>>('../actions/*.ts', { eager: true })

const actionRegistry: Record<string, ActionFn> = {}
for (const path in actionModules) {
  const mod = actionModules[path]
  for (const name in mod) {
    if (typeof mod[name] === 'function') {
      actionRegistry[name] = mod[name] as ActionFn
    }
  }
}

export function useDmActions(getContext: () => ActionContext) {
  async function dispatch(handler: string, payload?: unknown): Promise<void> {
    const fn = actionRegistry[handler]
    if (!fn) {
      console.warn(`[useDmActions] No action found for "${handler}". Export a function named "${handler}" from a file in features/form-renderer/actions/.`)
      return
    }
    await fn({ ...getContext(), payload })
  }

  return { dispatch }
}
