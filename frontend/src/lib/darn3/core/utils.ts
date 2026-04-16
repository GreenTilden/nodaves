/**
 * darn3 — Utility Functions
 *
 * Color manipulation, label formatting, and number display helpers
 * used across all renderers.
 *
 * @module darn3/core/utils
 */

/**
 * Truncate a label to fit within a given pixel width.
 * Assumes ~7px per character (monospace) or ~6px (sans-serif at 11px).
 *
 * @param text - Full label text
 * @param maxWidthPx - Available width in pixels
 * @param charWidth - Estimated character width (default: 6.5)
 * @returns Truncated string with "..." if needed
 */
export function truncateLabel(text: string, maxWidthPx: number, charWidth = 6.5): string {
  const maxChars = Math.floor(maxWidthPx / charWidth)
  if (text.length <= maxChars) return text
  if (maxChars < 4) return ''
  return text.slice(0, maxChars - 3) + '...'
}

/**
 * Format a number for display in tooltips and labels.
 *
 * @param value - Numeric value
 * @param opts - Formatting options
 * @returns Formatted string
 *
 * @example
 * formatNumber(1234.5)            // "1,235"
 * formatNumber(0.876, { pct: true }) // "87.6%"
 * formatNumber(15000, { prefix: '$' }) // "$15,000"
 */
export function formatNumber(
  value: number,
  opts?: { decimals?: number; pct?: boolean; prefix?: string; suffix?: string }
): string {
  const { decimals = 0, pct = false, prefix = '', suffix = '' } = opts || {}
  const v = pct ? value * 100 : value
  const formatted = v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: pct ? 1 : decimals,
  })
  return `${prefix}${formatted}${pct ? '%' : ''}${suffix}`
}

/**
 * Format a date string for display.
 * @param dateStr - ISO date string or YYYY-MM-DD
 * @param style - 'short' (Mar 15), 'medium' (Mar 15, 2026), 'full' (March 15, 2026)
 */
export function formatDate(dateStr: string, style: 'short' | 'medium' | 'full' = 'short'): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'))
  if (isNaN(d.getTime())) return dateStr
  const opts: Intl.DateTimeFormatOptions =
    style === 'short' ? { month: 'short', day: 'numeric' } :
    style === 'medium' ? { month: 'short', day: 'numeric', year: 'numeric' } :
    { month: 'long', day: 'numeric', year: 'numeric' }
  return d.toLocaleDateString('en-US', opts)
}

/**
 * Calculate WCAG relative luminance of a hex color.
 * @param hex - Color in #RRGGBB format
 * @returns Luminance value 0-1
 */
export function luminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)
  if (!rgb || rgb.length < 3) return 0.5
  const [r, g, b] = rgb.map(c => {
    const v = parseInt(c, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Choose black or white text color for maximum contrast against a background.
 * @param bgColor - Background color in #RRGGBB format
 * @returns '#000000' or '#ffffff'
 */
export function contrastText(bgColor: string): string {
  return luminance(bgColor) > 0.4 ? '#000000' : '#ffffff'
}

/**
 * Parse an ISO date or epoch to a Date object.
 * @param input - ISO string, YYYY-MM-DD, or epoch number
 */
export function parseDate(input: string | number): Date {
  if (typeof input === 'number') return new Date(input)
  return new Date(input + (input.includes('T') ? '' : 'T12:00:00'))
}
