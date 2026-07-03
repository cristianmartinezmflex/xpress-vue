import { reactive } from 'vue'

export interface CustomSyncTable {
  iDMTable: number
  bPartial:  boolean
}

interface DialogState {
  visible:  boolean
  tables:   CustomSyncTable[]
  onDone:   ((tables: CustomSyncTable[]) => void) | null
}

const state = reactive<DialogState>({
  visible: false,
  tables:  [],
  onDone:  null,
})

export function useCustomSyncDialog() {
  function show(currentJson: string | undefined, onDone: (tables: CustomSyncTable[]) => void) {
    let parsed: CustomSyncTable[] = []
    try {
      if (currentJson) parsed = JSON.parse(currentJson)
    } catch { /* ignore */ }
    state.tables  = parsed.map(t => ({ ...t }))
    state.onDone  = onDone
    state.visible = true
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
