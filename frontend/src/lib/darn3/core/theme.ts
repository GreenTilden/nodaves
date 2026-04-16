/**
 * darn3 — Theme Adapter
 *
 * Maps CSS custom properties to a standardized theme interface that all
 * darn3 renderers consume. Supports any dark-theme project that defines
 * the standard CSS variable set.
 *
 * @module darn3/core/theme
 *
 * @example
 * ```ts
 * import { getTheme, PALETTE } from '@/lib/darn3'
 *
 * const theme = getTheme(containerElement)
 * svg.style('color', theme.text)
 * ```
 */

/** Standardized theme colors for D3 visualizations */
export interface D3Theme {
  text: string
  textSecondary: string
  background: string
  surface: string
  card: string
  border: string
  grid: string
  primary: string
  success: string
  warning: string
  error: string
  accent: string
}

function css(el: HTMLElement, prop: string): string {
  return getComputedStyle(el).getPropertyValue(prop).trim()
}

/**
 * Read the current theme from CSS custom properties.
 *
 * Supports the DArnTech CSS variable naming convention:
 * `--bg-primary`, `--bg-secondary`, `--bg-card`, `--text-primary`,
 * `--text-secondary`, `--accent-*`, `--border-color`.
 *
 * Falls back to sensible dark-theme defaults if variables are missing.
 *
 * @param container - Element to read computed styles from (default: documentElement)
 * @returns Complete D3Theme object
 */
export function getTheme(container?: HTMLElement): D3Theme {
  const el = container || document.documentElement
  return {
    text: css(el, '--text-primary') || '#e0e0e0',
    textSecondary: css(el, '--text-secondary') || '#a0a0a0',
    background: css(el, '--bg-primary') || '#0f0f17',
    surface: css(el, '--bg-secondary') || '#16213e',
    card: css(el, '--bg-card') || '#0f3460',
    border: css(el, '--border-color') || '#2a2a4a',
    grid: 'rgba(42, 42, 74, 0.5)',
    primary: css(el, '--accent-blue') || '#6366f1',
    success: css(el, '--accent-green') || '#06d6a0',
    warning: css(el, '--accent-yellow') || '#ffd166',
    error: css(el, '--accent-red') || '#ef476f',
    accent: css(el, '--accent-blue') || '#6366f1',
  }
}

/**
 * 10-color categorical palette for general use.
 * Designed for dark backgrounds with good contrast and color-blindness accessibility.
 */
export const PALETTE: string[] = [
  '#6366f1', // indigo (primary)
  '#06d6a0', // green
  '#ffd166', // yellow
  '#00b4d8', // cyan
  '#ef476f', // red-pink
  '#9b5de5', // purple
  '#f77f00', // orange
  '#118ab2', // teal
  '#73d2de', // light cyan
  '#ff6b6b', // coral
]

/**
 * Get a color from the palette by index (wraps around).
 * @param index - Zero-based index
 * @param palette - Custom palette (default: PALETTE)
 */
export function paletteColor(index: number, palette: string[] = PALETTE): string {
  return palette[Math.abs(index) % palette.length]
}

/**
 * Deterministic color for a string key (consistent across renders).
 * Uses a simple hash to map any string to a palette color.
 */
export function hashColor(key: string, palette: string[] = PALETTE): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0
  }
  return palette[Math.abs(hash) % palette.length]
}
