import { inject, provide, reactive } from 'vue'

/**
 * Shared "selected row index per table" registry for master-detail control pairs (e.g. Genetec's
 * CloudLink Devices table + its RIO Door Settings detail). The master ControlTable writes its selected
 * row index under its control id; a detail control (ControlRioDoorSettings) bound via `value_from` reads
 * it back. Ephemeral UI state only — never persisted with the form.
 *
 * Provided once at the FormRenderer level so every section/control in the active tab shares one registry.
 */
export type TableSelection = Record<string, number | null>

const TABLE_SELECTION_KEY = Symbol('tableSelection')

export function provideTableSelection(): TableSelection {
  const selection = reactive<TableSelection>({})
  provide(TABLE_SELECTION_KEY, selection)
  return selection
}

export function useTableSelection(): TableSelection {
  // Fallback keeps standalone usage (tests, isolated mounts) from throwing.
  return inject<TableSelection>(TABLE_SELECTION_KEY, reactive<TableSelection>({}))
}
