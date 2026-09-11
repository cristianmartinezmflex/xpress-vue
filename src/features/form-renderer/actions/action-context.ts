// Shared action types used by the shared Data Manager action modules. Everything here is DM-agnostic —
// no field identifies or branches on a specific Data Manager.

export interface ActionContext {
  guid:              string | undefined
  state:             Record<string, any>
  serviceBase:       string
  navigate?:         (path: string) => void
  /** Resets the form controls to their schema defaults (provided by the view). */
  resetToDefaults?:  () => void
  /** Optional per-invocation payload (e.g. the specific device a per-row button acted on). */
  payload?:          unknown
}

export type ActionFn = (ctx: ActionContext) => void | Promise<void>
