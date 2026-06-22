import { reactive, readonly } from 'vue'
import type { FormSchema, Control } from '../types/schema'

/**
 * Coerces a raw API value to the type expected by the control.
 * The service stores everything as strings in the DB, so booleans arrive as
 * "True"/"False" and numbers as "42" — normalise them here.
 */
function coerceValue(value: any, control: Control): any {
  if (value === null || value === undefined) return value

  if (control.type === 'boolean') {
    if (typeof value === 'boolean') return value
    const s = String(value).toLowerCase().trim()
    return s === 'true' || s === '1' || s === 'yes'
  }

  if (control.type === 'number' || control.type === 'number_spinner') {
    const n = Number(value)
    return isNaN(n) ? value : n
  }

  // keyvalue: the service returns a plain object {"key": "value", ...}
  // but ControlKeyValue expects [{key, value}, ...].
  if (control.type === 'keyvalue') {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([k, v]) => ({ key: k, value: String(v) }))
    }
    return []
  }

  return value
}

export function useFormState(schema: FormSchema, initialValues?: Record<string, any>) {
  const state = reactive<Record<string, any>>({})
  const errors = reactive<Record<string, string>>({})

  function initState() {
    schema.tabs.forEach((tab) => {
      tab.columns?.forEach((col) => {
        col.sections.forEach((section) => {
          section.controls.forEach((control) => {
            if (!control.id) return

            if (initialValues && control.id in initialValues) {
              // API value takes precedence over the schema default.
              state[control.id] = coerceValue(initialValues[control.id], control)
            } else if (control.default !== undefined) {
              state[control.id] = control.default
            }
          })
        })
      })
    })
  }

  function validate(control: Control): boolean {
    if (!control.validations?.length) return true
    const val = state[control.id]
    errors[control.id] = ''

    for (const rule of control.validations) {
      const isEmpty = val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))
      if (rule.type === 'required' && isEmpty) {
        errors[control.id] = rule.error
        return false
      }
      if (rule.type === 'regex' && rule.pattern) {
        const re = new RegExp(rule.pattern)
        if (!re.test(String(val))) {
          errors[control.id] = rule.error
          return false
        }
      }
      if (rule.type === 'min_max') {
        const n = Number(val)
        if (isNaN(n) || (rule.min !== undefined && n < rule.min) || (rule.max !== undefined && n > rule.max)) {
          errors[control.id] = rule.error
          return false
        }
      }
    }
    return true
  }

  initState()

  return { state, errors: readonly(errors), validate }
}
