/**
 * dmFetch — the single way the form renderer fetches option lists / field lists from the service.
 *
 * A control's `loadFrom` / `dynOptions` / `destinationLoadFrom` is one of:
 *
 *  1. A DM custom-action read — a bare "get-*" token (e.g. "get-directories", "get-custom-fields-users").
 *     Sent as POST /dm/{guid}/custom with body { action, ...params }. This is the unified endpoint; the
 *     plugin's ExecuteCustomAction handles it. `params` (DynOptionsParams) ride in the same body — e.g.
 *     OnGuard "Directory" against the just-typed host/port — so the list reflects unsaved input.
 *
 *  2. A DM-agnostic shared GET URL — "/api/shared/zones", "/api/shared/entity-fields-users", or the
 *     legacy short form "shared/<type>". Fetched with GET; no guid required for the absolute form.
 *
 * Full paths may be templated with {dmId} (substituted with the guid). Returns the raw Response so callers
 * keep their own res.ok / res.json() handling; returns null when the request can't be built (missing
 * source/serviceBase, or a guid-requiring source with no guid).
 */
export async function dmFetch(
  source: string | undefined,
  serviceBase: string,
  guid?: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<Response | null> {
  if (!source || !serviceBase) return null

  // Shared / absolute GET URL, optionally templated with {dmId}.
  if (source.startsWith('/') || source.startsWith('http')) {
    let path = source
    if (path.includes('{dmId}')) {
      if (!guid) return null
      path = path.replace(/\{dmId\}/g, guid)
    }
    return fetch(path.startsWith('http') ? path : `${serviceBase}${path}`)
  }

  // Legacy short form "shared/<type>" (static JSON schemas) → GET /api/shared/<type>.
  if (source.startsWith('shared/')) return fetch(`${serviceBase}/api/${source}`)

  // DM custom read/action: POST { action, ...params } to the unified endpoint.
  if (!guid) return null
  const body: Record<string, unknown> = { action: source }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') body[k] = v
    }
  }
  return fetch(`${serviceBase}/dm/${guid}/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
