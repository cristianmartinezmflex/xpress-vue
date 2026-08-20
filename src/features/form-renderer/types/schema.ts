// --- Dynamic conditions ---

export interface HasValueCondition {
  type: 'hasValue'
  field: string
  pattern?: string  // optional regex — if provided, field value must match
}

export interface EqualsCondition {
  type: 'equals'
  field: string
  value: any
}

export type DynamicCondition = HasValueCondition | EqualsCondition

// enable/display can be:
//   true | false          → static
//   string                → expression evaluated against form state, e.g. "field == true"
//   DynamicCondition      → legacy object format, evaluated at runtime against form state
export type EnableProp  = boolean | string | DynamicCondition
export type DisplayProp = boolean | string | DynamicCondition

// --- Schema types ---

export interface Validation {
  type: 'required' | 'regex' | 'min_max'
  pattern?: string
  min?: number
  max?: number
  error: string
}

export interface SelectOption {
  id:   string | number   // stored value
  name: string            // label shown to the user
}

export interface ContextMenuItem {
  label:   string
  onClick: string
}

export interface Button {
  id:               string
  title:            string
  onClick?:         string   // frontend handler name (dispatched via useDmActions)
  verb?:            string   // REST button: HTTP verb (default POST) — used when there's no onClick
  action?:          string   // REST button: URL template (may contain {dmId}); clicking hits this URL
  tooltip?:         string
  rightClickMenu?:  ContextMenuItem[]
  enable?:          EnableProp
}

export interface KeyValuePair {
  key: string
  value: string
}

export type ControlType =
  | 'text'
  | 'password'
  | 'boolean'
  | 'number'
  | 'number_spinner'
  | 'select'
  | 'select_dynamic'
  | 'radio'
  | 'button_bar'
  | 'customFields'
  | 'log_view'
  | 'socket_interfaces'
  | 'ip_badge_mappings'
  | 'site_timezones'
  | 'checkbox_multiselect'
  | 'table'

export interface Control {
  id: string
  type: ControlType
  title?: string
  default?: any
  validations?: Validation[]
  options?: SelectOption[]
  buttons?: Button[]
  fields?: Control[]   // table: column/field defs (each a control) that drive the grid + Add-row modal
  isKey?: boolean      // table field: marks the row's identity/display column
  key_title?: string
  key_header?: string
  value_title?: string
  value_header?: string
  entity?: string              // customFields: which local entity the mapping targets (Users/Badges/...)
  destinationLoadFrom?: string // customFields: source for the "Destination Columns" (XPressEntry fields)
  loadFrom?: string   // select_dynamic/checkbox_multiselect/customFields source (options fetched from the API):
                      //   "shared/<type>" → GET /api/shared/<type>              (DM-agnostic local data)
                      //   "<type>"        → GET .../{guid}/dm-data?type=<type>  (DM-specific data)
  optionsKey?: string // checkbox_multiselect: form-state key holding the [{ id, name }] option list
                      // (populated by an action/button); value is a separator-joined list of ids
  separator?: string  // checkbox_multiselect: token joining selected ids (default ","; "\b"/vbBack for AEOS)
  enable?: EnableProp
  display?: DisplayProp
  disabled?: boolean
  value_from?: string  // read-only mirror of another field's value (field id to mirror)
  invert?: boolean     // used with value_from on boolean controls: displays the inverse value
  inverts?: string     // when set, clicking this boolean writes the inverse to this field id instead of control.id
}

export interface Column {
  controls: Control[]
  enable?: EnableProp
  display?: DisplayProp
}

export interface Section {
  title?: string
  columns: Column[]
  enable?: EnableProp
  display?: DisplayProp
}

export interface Tab {
  title: string
  sections?: Section[]
  enable?: EnableProp
  display?: DisplayProp
}

export interface SchemaMeta {
  icon?:       string
  badge?:      string
  badgeColor?: string
}

export interface FormSchema {
  /** Display title shown in the form header. Falls back to a prettified schema key if omitted. */
  title?: string
  /** Card presentation (icon/badge) used on the Home listing. */
  meta?: SchemaMeta
  tabs: Tab[]
  customSyncTables?: string[]
}
