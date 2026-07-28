// RS2 REST-specific actions. Dispatched by the `rs2_` prefix (see useDmActions.ts).
import type { ActionContext } from './action-context'

export async function rs2_loadSites({ guid, state, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/rs2/sites`)
  if (!res.ok) { alert(`Error loading sites: HTTP ${res.status}`); return }
  const sites: { id: string; name: string }[] = await res.json()
  // Store loaded sites in a transient state key so ControlSiteTimezones can display names.
  state['_rs2_sites_cache'] = JSON.stringify([{ id: '-1', name: 'All Sites' }, ...sites])
  alert(`Loaded ${sites.length} site(s) from RS2. Sites are now available in the Site Timezones dropdown.`)
}

export async function rs2_loadUserFields({ guid, state, serviceBase }: ActionContext): Promise<void> {
  if (!guid) { alert('No GUID provided.'); return }
  const res = await fetch(`${serviceBase}/api/data-managers/${guid}/rs2/user-fields`)
  if (!res.ok) { alert(`Error loading user fields: HTTP ${res.status}`); return }
  const fields: string[] = await res.json()
  const existing: { key: string; value: string }[] = Array.isArray(state['custom_fields_users'])
    ? state['custom_fields_users']
    : []
  const existingKeys = new Set(existing.map((r) => r.key))
  state['custom_fields_users'] = [...existing, ...fields.filter((f) => !existingKeys.has(f)).map((f) => ({ key: f, value: '' }))]
}
