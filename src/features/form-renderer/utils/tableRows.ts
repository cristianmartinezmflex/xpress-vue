/**
 * Display order for a settings table's rows.
 *
 * When the table has a numeric identity field (`idField`, e.g. RIODevice "ID"), rows are shown in
 * DESCENDING id order to match the WinForm: it stores devices in a .NET Hashtable keyed by that id, and
 * a .NET Hashtable enumerates small integer keys in descending order — so the newest (highest-id) device
 * appears first there. Keeping the same order in the Vue grid (and in any master-detail that reads the
 * same rows) means the two apps list devices identically and selection indices stay in sync.
 *
 * Without an idField the original array order is preserved.
 */
export function sortRowsForDisplay<T extends Record<string, any>>(rows: T[], idField?: string): T[] {
  if (!idField) return rows
  return [...rows].sort((a, b) => Number(b[idField] ?? -1) - Number(a[idField] ?? -1))
}
