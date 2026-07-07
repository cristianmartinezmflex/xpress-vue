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
  text: string
  value?: string | number
}

export interface ContextMenuItem {
  label:   string
  onClick: string
}

export interface Button {
  id:               string
  title:            string
  onClick:          string
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
  | 'radio'
  | 'button_bar'
  | 'keyvalue'
  | 'log_view'

export interface Control {
  id: string
  type: ControlType
  title?: string
  default?: any
  validations?: Validation[]
  values?: SelectOption[]
  buttons?: Button[]
  key_title?: string
  key_header?: string
  value_title?: string
  value_header?: string
  enable?: EnableProp
  display?: DisplayProp
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

export interface FormSchema {
  tabs: Tab[]
  customSyncTables?: string[]
}
