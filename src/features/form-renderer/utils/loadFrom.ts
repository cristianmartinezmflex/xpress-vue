/**
 * Resolves a control's `loadFrom` / `destinationLoadFrom` to an absolute request URL.
 *
 * Two formats are supported:
 *
 *  1. Full path / template — emitted by the .NET schema generator (service-driven schemas, e.g. Genetec):
 *       "/api/shared/zones"
 *       "/api/shared/user_profiles"
 *       "/api/data-managers/{dmId}/dm-data?type=custom-fields-users"
 *     `{dmId}` is substituted with the DM guid; a relative path gets `serviceBase` prepended.
 *
 *  2. Legacy short form — used by the static src/data/<dm>.json schemas:
 *       "shared/<type>" → GET /api/shared/<type>              (DM-agnostic local data, no guid)
 *       "<type>"        → GET .../{guid}/dm-data?type=<type>  (DM-specific data)
 *
 * Returns null when the URL requires a guid that isn't available.
 */
export function resolveLoadFromUrl(loadFrom: string | undefined, serviceBase: string, guid?: string): string | null {
  if (!loadFrom || !serviceBase) return null

  // New format: absolute path or full URL, optionally templated with {dmId}.
  if (loadFrom.startsWith('/') || loadFrom.startsWith('http')) {
    let path = loadFrom
    if (path.includes('{dmId}')) {
      if (!guid) return null
      path = path.replace(/\{dmId\}/g, guid)
    }
    return path.startsWith('http') ? path : `${serviceBase}${path}`
  }

  // Legacy short form.
  if (loadFrom.startsWith('shared/')) return `${serviceBase}/api/shared/${loadFrom.slice(7)}`
  if (!guid) return null
  return `${serviceBase}/api/data-managers/${guid}/dm-data?type=${encodeURIComponent(loadFrom)}`
}
