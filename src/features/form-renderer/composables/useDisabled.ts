import type { EnableProp, DisplayProp, DynamicCondition } from '../types/schema'

function evaluateCondition(cond: DynamicCondition, state: Record<string, any>): boolean {
  const val = state[cond.field]

  if (cond.type === 'hasValue') {
    if (val === null || val === undefined || val === '') return false
    if (cond.pattern) return new RegExp(cond.pattern).test(String(val))
    return true
  }

  if (cond.type === 'equals') {
    return val === cond.value
  }

  return true
}

// Returns true when the element should be ENABLED (interactive)
export function evaluateEnable(
  prop: EnableProp | undefined,
  state: Record<string, any>,
): boolean {
  if (prop === undefined) return true
  if (typeof prop === 'boolean') return prop
  return evaluateCondition(prop, state)
}

// Returns true when the element should be VISIBLE
export function evaluateDisplay(
  prop: DisplayProp | undefined,
  state: Record<string, any>,
): boolean {
  if (prop === undefined) return true
  if (typeof prop === 'boolean') return prop
  return evaluateCondition(prop, state)
}
