import { useEffect, useState } from 'react'

/**
 * Returns `value`, but only after it has stopped changing for `delayMs`.
 * Used on list-screen search inputs, which previously fired one API
 * request per keystroke (QA finding, 2026-10-01) because the raw input
 * value was wired directly into the hook that triggers the fetch.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
