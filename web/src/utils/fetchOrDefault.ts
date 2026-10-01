/**
 * Resolves a request to a fallback value instead of rejecting, so one 403'd
 * lookup (a role lacking that resource's `.view` permission) doesn't cascade
 * through `Promise.all` and blank out sibling data the user *does* have
 * access to. Logs a warning rather than failing silently.
 */
export async function fetchOrDefault<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch (err) {
    console.warn('Lookup request failed, using fallback value:', err)
    return fallback
  }
}
