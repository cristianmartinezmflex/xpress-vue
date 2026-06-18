import type { DisabledCondition } from '../types/schema'

export function evaluateDisabled(
  condition: DisabledCondition | undefined,
  state: Record<string, any>,
): boolean {
  if (!condition) return false
  const val = state[condition.id]
  if (condition.op === 'eq')  return val === condition.value
  if (condition.op === 'neq') return val !== condition.value
  return false
}
