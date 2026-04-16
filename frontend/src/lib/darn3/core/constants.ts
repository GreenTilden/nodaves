/**
 * darn3 — Default Constants
 *
 * Sizing, spacing, and visual defaults for all renderers.
 * Override via config objects passed to individual renderers.
 *
 * @module darn3/core/constants
 */

/** Default chart dimensions when container size isn't available */
export const DEFAULT_WIDTH = 600
export const DEFAULT_HEIGHT = 320

/** Margins for charts with axes */
export const DEFAULT_MARGIN = {
  top: 30,
  right: 20,
  bottom: 30,
  left: 40,
} as const

/** Phase color mapping for milestone/deployment visualizations */
export const PHASE_COLORS: Record<string, string> = {
  'foundation': '#64748b',    // gray — setup phase
  'paternity': '#00b4d8',     // cyan — baby time
  'transition': '#ffd166',    // yellow — career shift
  'launch': '#06d6a0',        // green — go live
  'steady-state': '#f0c040',  // gold — sustain
  'brass-ring': '#c9a227',    // brass — aspirational acquisitions
  'default': '#6366f1',       // indigo — fallback
}

/** Status color mapping */
export const STATUS_COLORS: Record<string, string> = {
  'completed': '#06d6a0',
  'active': '#00b4d8',
  'in-progress': '#ffd166',
  'upcoming': '#64748b',
  'blocked': '#ef476f',
  'not-started': '#4a5568',
}

/** Gauge threshold defaults (percentage-based) */
export const GAUGE_THRESHOLDS: [number, number] = [0.33, 0.66]

/** Animation durations in ms */
export const ANIM = {
  fast: 300,
  normal: 600,
  slow: 1000,
} as const
