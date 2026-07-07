import { reactive } from 'vue'

export interface CustomSyncTable {
  iDMTable: number
  bPartial:  boolean
}

interface DialogState {
  visible:       boolean
  tables:        CustomSyncTable[]
  allowedTables: string[] | null  // null = all tables; values are label names e.g. "USERS"
  onDone:        ((tables: CustomSyncTable[]) => void) | null
}

const state = reactive<DialogState>({
  visible:       false,
  tables:        [],
  allowedTables: null,
  onDone:        null,
})

export function useCustomSyncDialog() {
  function show(
    currentJson:   string | undefined,
    onDone:        (tables: CustomSyncTable[]) => void,
    allowedTables?: string[],
  ) {
    let parsed: CustomSyncTable[] = []
    try {
      if (currentJson) parsed = JSON.parse(currentJson)
    } catch { /* ignore */ }
    state.tables        = parsed.map(t => ({ ...t }))
    state.allowedTables = allowedTables?.length ? allowedTables : null
    state.onDone        = onDone
    state.visible       = true
  }

  function confirm() {
    state.onDone?.(state.tables.map(t => ({ ...t })))
    state.visible = false
  }

  function cancel() {
    state.visible = false
  }

  return { state, show, confirm, cancel }
}
