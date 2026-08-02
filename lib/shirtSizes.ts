export const SHIRT_SIZES = [
  '110-116',
  '122-128',
  '134-140',
  '146-152',
  '158-164',
  'XS',
  'S',
  'M',
  'L',
  'XL',
] as const

export type ShirtSize = (typeof SHIRT_SIZES)[number]

export function isShirtSize(value: string): value is ShirtSize {
  return (SHIRT_SIZES as readonly string[]).includes(value)
}
