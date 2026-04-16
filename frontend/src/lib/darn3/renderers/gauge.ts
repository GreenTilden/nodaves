/**
 * darn3 — Radial Gauge Renderer
 *
 * Compact radial progress gauge for goal tracking. Renders a 240-degree
 * arc with a color gradient (red-yellow-green) based on configurable
 * thresholds, a center value display, and an animated fill.
 *
 * @module darn3/renderers/gauge
 * @category Renderer
 *
 * @example
 * ```ts
 * import { renderGauge } from '@/lib/darn3/renderers/gauge'
 *
 * const result = renderGauge(container, 72, {
 *   label: 'Sprint Progress',
 *   unit: '%',
 *   max: 100,
 *   thresholds: [33, 66],
 * })
 * // later: result.cleanup()
 * ```
 */

import * as d3 from 'd3'
import { getTheme, PALETTE, paletteColor } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import type { GaugeConfig, D3RenderResult } from '../core/types'
import { formatDate, formatNumber, truncateLabel, contrastText, parseDate } from '../core/utils'
import { PHASE_COLORS, STATUS_COLORS, ANIM, DEFAULT_MARGIN } from '../core/constants'

const ARC_START = -2 * Math.PI / 3   // -120 degrees
const ARC_END = 2 * Math.PI / 3      // +120 degrees
const ARC_SPAN = ARC_END - ARC_START  // 240 degrees

/**
 * Render a radial progress gauge.
 *
 * @param container - DOM element to render into (designed for 160x160px cells)
 * @param value - Current value to display
 * @param config - Optional label, unit, max, thresholds, animation toggle
 * @returns D3RenderResult with cleanup function and svg reference
 *
 * @example
 * ```ts
 * const { cleanup } = renderGauge(el, 42, { label: 'Bankroll', unit: '$', max: 250 })
 * onUnmounted(cleanup)
 * ```
 */
export function renderGauge(
  container: HTMLElement,
  value: number,
  config?: GaugeConfig
): D3RenderResult {
  const theme = getTheme(container)
  const size = Math.min(
    config?.width || container.clientWidth || 160,
    config?.height || container.clientHeight || 160
  )
  const max = config?.max || 100
  const thresholds = config?.thresholds || [33, 66]
  const animate = config?.animate !== false
  const unit = config?.unit || ''
  const label = config?.label || ''

  const radius = size * 0.42
  const thickness = radius * 0.22
  const cx = size / 2
  const cy = size / 2 + size * 0.05 // shift down slightly to center the open arc

  const pct = Math.max(0, Math.min(value / max, 1))

  // Color based on thresholds (percentage of max)
  function arcColor(p: number): string {
    const t0 = thresholds[0] / 100
    const t1 = thresholds[1] / 100
    if (p < t0) return theme.error
    if (p < t1) return theme.warning
    return theme.success
  }

  // Arc generator
  const arc = d3.arc<{ startAngle: number; endAngle: number }>()
    .innerRadius(radius - thickness)
    .outerRadius(radius)
    .startAngle(ARC_START)
    .cornerRadius(thickness / 2)

  const svg = d3.select(container)
    .append('svg')
    .attr('width', size)
    .attr('height', size)

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`)

  // Background arc
  g.append('path')
    .datum({ startAngle: ARC_START, endAngle: ARC_END })
    .attr('d', arc as any)
    .attr('fill', theme.surface)

  // Fill arc
  const targetEnd = ARC_START + ARC_SPAN * pct
  const fillPath = g.append('path')
    .datum({ startAngle: ARC_START, endAngle: animate ? ARC_START : targetEnd })
    .attr('d', arc as any)
    .attr('fill', arcColor(pct))

  if (animate) {
    fillPath.transition()
      .duration(ANIM.normal)
      .ease(d3.easeQuadOut)
      .attrTween('d', function () {
        const interp = d3.interpolate(ARC_START, targetEnd)
        return (t: number) => arc({ startAngle: ARC_START, endAngle: interp(t) }) || ''
      })
  }

  // Center value text
  const displayValue = unit === '%'
    ? formatNumber(value, { decimals: 0 })
    : unit === '$'
      ? formatNumber(value, { prefix: '$', decimals: 0 })
      : formatNumber(value, { decimals: 0, suffix: unit ? ` ${unit}` : '' })

  g.append('text')
    .attr('y', 4)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('fill', theme.text)
    .style('font-size', `${Math.round(size * 0.16)}px`)
    .style('font-weight', 'bold')
    .text(displayValue)

  // Label below arc
  if (label) {
    svg.append('text')
      .attr('x', cx)
      .attr('y', cy + radius + thickness + 4)
      .attr('text-anchor', 'middle')
      .style('fill', theme.textSecondary)
      .style('font-size', `${Math.round(size * 0.075)}px`)
      .text(truncateLabel(label, size - 16))
  }

  return {
    cleanup: () => { svg.remove() },
    svg: svg as any,
  }
}
