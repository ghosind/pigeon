/**
 * variableParser — multi-layer variable substitution engine.
 *
 * Three-layer priority:
 *   1. Local variables (per-request)
 *   2. Environment variables (active environment)
 *   3. Global variables (cross-workspace)
 *
 * Usage:
 *   const result = resolveVariables('https://{{host}}/api/{{endpoint}}', envVars, globalVars)
 *   // => 'https://example.com/api/users'
 */

const VAR_PATTERN = /\{\{([^}]+)\}\}/g

export interface VariableSource {
  [key: string]: string
}

/**
 * Resolve all {{variable}} placeholders in the input string.
 * Searches through local → env → global variable sources in order.
 */
export function resolveVariables(
  input: string,
  envVars: VariableSource = {},
  globalVars: VariableSource = {},
  localVars: VariableSource = {}
): string {
  if (!input || typeof input !== 'string') return input

  return input.replace(VAR_PATTERN, (_match, varName: string) => {
    const key = varName.trim()
    // Priority: local > env > global
    if (key in localVars) return localVars[key]
    if (key in envVars) return envVars[key]
    if (key in globalVars) return globalVars[key]
    // Keep unresolved placeholder as-is
    return `{{${key}}}`
  })
}

/**
 * Resolve variables in a KeyValuePair array.
 */
export function resolveKVPairs(
  pairs: { key: string; value: string; enabled: boolean }[],
  envVars: VariableSource = {},
  globalVars: VariableSource = {},
  localVars: VariableSource = {}
): { key: string; value: string; enabled: boolean }[] {
  return pairs.map((p) => ({
    ...p,
    key: resolveVariables(p.key, envVars, globalVars, localVars),
    value: resolveVariables(p.value, envVars, globalVars, localVars)
  }))
}

/**
 * Find all unique variable names referenced in a string.
 */
export function extractVariableNames(input: string): string[] {
  const names = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(VAR_PATTERN.source, 'g')
  while ((match = re.exec(input)) !== null) {
    names.add(match[1].trim())
  }
  return Array.from(names)
}

/**
 * Test if a string contains any variable references.
 */
export function hasVariables(input: string): boolean {
  return VAR_PATTERN.test(input)
}
