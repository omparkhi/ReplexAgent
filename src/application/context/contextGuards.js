/**
 * @template T
 * @param {unknown} value
 * @returns {value is T}
 */
export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
export function asRecord(value) {
  return isRecord(value) ? value : {};
}

/**
 * @template T
 * @param {unknown} value
 * @returns {T[]}
 */
export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function asOptionalString(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown> | undefined} source
 * @returns {Record<string, unknown>}
 */
export function mergeRecord(target, source) {
  if (!source) {
    return target;
  }

  return { ...target, ...source };
}
