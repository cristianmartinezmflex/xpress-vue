export interface DisabledCondition {
  id: string
  op: 'eq' | 'neq'
  value: any
}

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

export interface Button {
  id: string
  title: string
  onClick: string
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
  disabled_when?: DisabledCondition
}

export interface Section {
  title?: string
  controls: Control[]
  disabled_when?: DisabledCondition
}

export interface Column {
  sections: Section[]
}

export interface Tab {
  title: string
  columns?: Column[]
}

export interface FormSchema {
  tabs: Tab[]
}
