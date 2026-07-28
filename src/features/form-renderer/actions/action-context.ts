// Shared action types used by the shared and per-Data-Manager action modules.

export interface ActionContext {
  guid:              string | undefined
  state:             Record<string, any>
  serviceBase:       string
  schemaKey?:        string
  customSyncTables?: string[]
  navigate?:         (path: string) => void
  /** Resets the form controls to their schema defaults (provided by the view). */
  resetToDefaults?:  () => void
  /** Optional per-invocation payload (e.g. the specific device a per-row button acted on). */
  payload?:          unknown
}

export type ActionFn = (ctx: ActionContext) => void | Promise<void>
