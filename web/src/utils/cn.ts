type ClassValue = string | number | null | undefined | false | ClassValue[]

function flatten(value: ClassValue, out: string[]): void {
  if (!value) return
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out)
    return
  }
  out.push(String(value))
}

/** Joins conditional class names, skipping falsy values. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = []
  flatten(values, out)
  return out.join(' ')
}
