import type { EnableProp, DisplayProp, DynamicCondition } from '../types/schema'

function evaluateObjectCondition(cond: DynamicCondition, state: Record<string, any>): boolean {
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

// Evaluates a single comparison like "field == true", "field != 'DataConduit'", "count >= 5"
function evaluateSingleExpression(expr: string, state: Record<string, any>): boolean {
  const match = expr.trim().match(/^(\S+)\s*(==|!=|>=|<=|>|<|=)\s*(?:'([^']*)'|(\S+))$/)
  if (!match) throw new Error(`[useDisabled] Invalid expression: "${expr}"`)

  const [, field, operator, strValue, rawValue] = match
  const isString = strValue !== undefined

  const actual = state[field]

  let value: any
  if (isString) {
    value = strValue
  } else if (rawValue === 'true') {
    value = true
  } else if (rawValue === 'false') {
    value = false
  } else if (rawValue === 'null') {
    value = null
  } else {
    value = parseFloat(rawValue)
  }

  const a = isString || typeof value === 'boolean' || value === null ? actual : parseFloat(String(actual))

  switch (operator) {
    case '=':
    case '==': return a == value
    case '!=':  return a != value
    case '>':   return a >  value
    case '>=':  return a >= value
    case '<':   return a <  value
    case '<=':  return a <= value
    default: throw new Error(`[useDisabled] Unknown operator: "${operator}"`)
  }
}

// Evaluates an expression string — supports && and || between simple comparisons.
// Examples: "field == true", "a == true && b == false", "x == 1 || y == 2"
function evaluateExpression(expr: string, state: Record<string, any>): boolean {
  if (expr.includes('&&')) {
    return expr.split('&&').every(part => evaluateSingleExpression(part, state))
  }
  if (expr.includes('||')) {
    return expr.split('||').some(part => evaluateSingleExpression(part, state))
  }
  return evaluateSingleExpression(expr, state)
}

// Returns true when the element should be ENABLED (interactive)
export function evaluateEnable(
  prop: EnableProp | undefined,
  state: Record<string, any>,
): boolean {
  if (prop === undefined) return true
  if (typeof prop === 'boolean') return prop
  if (typeof prop === 'string') return evaluateExpression(prop, state)
  return evaluateObjectCondition(prop, state)
}

// Returns true when the element should be VISIBLE
export function evaluateDisplay(
  prop: DisplayProp | undefined,
  state: Record<string, any>,
): boolean {
  if (prop === undefined) return true
  if (typeof prop === 'boolean') return prop
  if (typeof prop === 'string') return evaluateExpression(prop, state)
  return evaluateObjectCondition(prop, state)
}
