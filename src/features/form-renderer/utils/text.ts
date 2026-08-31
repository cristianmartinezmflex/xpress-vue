/**
 * Truncate a dropdown option label so a native <select> popup can't stretch to the width of an
 * extremely long option (e.g. a name with a GUID suffix). Only the DISPLAYED text is shortened — the
 * stored option value (id) is never touched. The full text is still available via the option's title.
 */
export function truncateLabel(s: string | number | null | undefined, max = 60): string {
  const str = String(s ?? '')
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
