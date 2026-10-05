/** Formats a price in the smallest currency unit (e.g. cents) as "$49", "$0", using Intl for currency-correct formatting. */
export function formatPriceCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}
