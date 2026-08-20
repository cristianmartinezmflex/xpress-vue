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

// Splits `s` at every top-level (paren depth 0, outside quotes) occurrence of `op`.
// Returns null when `op` doesn't appear at the top level.
function splitTopLevel(s: string, op: string): string[] | null {
  const parts: string[] = []
  let depth = 0, inQuote = false, last = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === "'") inQuote = !inQuote
    else if (!inQuote && c === '(') depth++
    else if (!inQuote && c === ')') depth--
    else if (!inQuote && depth === 0 && s.startsWith(op, i)) {
      parts.push(s.slice(last, i))
      i += op.length - 1
      last = i + 1
    }
  }
  if (parts.length === 0) return null
  parts.push(s.slice(last))
  return parts
}

// Evaluates an expression string with correct precedence: || (lowest) → && → parentheses → comparison.
// Examples: "field == true", "a == true && b == false", "(a == 1 || b == 2) && c == false"
function evaluateExpression(expr: string, state: Record<string, any>): boolean {
  const s = expr.trim()
  const orParts = splitTopLevel(s, '||')
  if (orParts) return orParts.some(p => evaluateExpression(p, state))
  const andParts = splitTopLevel(s, '&&')
  if (andParts) return andParts.every(p => evaluateExpression(p, state))
  if (s.startsWith('(') && s.endsWith(')')) return evaluateExpression(s.slice(1, -1), state)
  return evaluateSingleExpression(s, state)
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
