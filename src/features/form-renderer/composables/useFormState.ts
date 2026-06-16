import { reactive, readonly } from 'vue'
import type { FormSchema, Control } from '../types/schema'

export function useFormState(schema: FormSchema) {
  const state = reactive<Record<string, any>>({})
  const errors = reactive<Record<string, string>>({})

  function initState() {
    schema.tabs.forEach((tab) => {
      tab.columns?.forEach((col) => {
        col.sections.forEach((section) => {
          section.controls.forEach((control) => {
            if (control.id && control.default !== undefined) {
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
