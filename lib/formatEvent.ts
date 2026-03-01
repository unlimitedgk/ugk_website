export function formatPrice(price: number | string): string {
  const numericPrice = Number(price)
  if (Number.isNaN(numericPrice)) {
    return '—'
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(numericPrice)
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return '—'
  const parts = time.split(':').slice(0, 2)
  if (parts.length < 2) return time
  return `${parts[0]}:${parts[1]}`
}

/**
 * Format address as "street, postal_code city". Any argument may be null/undefined.
 * Returns null if all parts are empty.
 */
export function formatLocation(
  street: string | null | undefined,
  postalCode: string | null | undefined,
  city: string | null | undefined
): string | null {
  const streetPart = street?.trim() || null
  const postalPart = postalCode?.trim() || null
  const cityPart = city?.trim() || null
  const cityLine = [postalPart, cityPart].filter(Boolean).join(' ') || null
  const parts = [streetPart, cityLine].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}
