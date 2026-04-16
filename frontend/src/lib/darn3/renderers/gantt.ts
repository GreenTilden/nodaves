/**
 * darn3 — Gantt Chart Renderer
 *
 * Horizontal Gantt chart for deployment and milestone timelines.
 * Each item renders as a rounded bar spanning its date range, colored
 * by group with an optional progress overlay.
 *
 * @module darn3/renderers/gantt
 * @category Renderer
 *
 * @example
 * ```ts
 * import { renderGantt } from '@/lib/darn3/renderers/gantt'
 *
 * const result = renderGantt(container, [
 *   { id: '1', label: 'Design', group: 'Frontend', start: '2026-03-01', end: '2026-03-15', progress: 80 },
 *   { id: '2', label: 'API Build', group: 'Backend', start: '2026-03-10', end: '2026-04-01', progress: 40 },
 * ])
 * // later: result.cleanup()
 * ```
 */

import * as d3 from 'd3'
import { getTheme, PALETTE, paletteColor } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import type { GanttItem, GanttConfig, D3RenderResult } from '../core/types'
import { formatDate, formatNumber, truncateLabel, contrastText, parseDate } from '../core/utils'
import { PHASE_COLORS, STATUS_COLORS, ANIM, DEFAULT_MARGIN } from '../core/constants'

const LABEL_MARGIN = 140

/**
 * Render a horizontal Gantt chart.
 *
 * @param container - DOM element to render into
 * @param data - Array of GanttItem objects with start/end dates
 * @param config - Optional sizing, today marker, and click callback
 * @returns D3RenderResult with cleanup function and svg reference
 *
 * @example
 * ```ts
 * const { cleanup } = renderGantt(el, items, { showToday: true })
 * onUnmounted(cleanup)
 * ```
 */
export function renderGantt(
  container: HTMLElement,
  data: GanttItem[],
  config?: GanttConfig
): D3RenderResult {
  const theme = getTheme(container)
  const width = config?.width || container.clientWidth || 600
  const height = config?.height || container.clientHeight || Math.max(200, data.length * 32 + 60)
  const margin = { top: DEFAULT_MARGIN.top, right: DEFAULT_MARGIN.right, bottom: DEFAULT_MARGIN.bottom, left: LABEL_MARGIN }

  const sorted = [...data].sort((a, b) => parseDate(a.start).getTime() - parseDate(b.start).getTime())

  // Unique groups for color mapping
  const groups = [...new Set(sorted.map(d => d.group))]
  const groupColor = (g: string) => paletteColor(groups.indexOf(g))

  // Scales
  const xMin = d3.min(sorted, d => parseDate(d.start))!
  const xMax = d3.max(sorted, d => parseDate(d.end))!
  const x = d3.scaleTime().domain([xMin, xMax]).range([margin.left, width - margin.right])
  const y = d3.scaleBand().domain(sorted.map(d => d.id)).range([margin.top, height - margin.bottom]).padding(0.25)

  const tooltip = createTooltip(container)

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('overflow', 'visible')

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.selectAll('text').style('fill', theme.textSecondary).style('font-size', '10px'))
    .call(g => g.selectAll('line, path').style('stroke', theme.border))

  // Y axis labels
  svg.selectAll('.gantt-label')
    .data(sorted)
    .join('text')
    .attr('class', 'gantt-label')
    .attr('x', margin.left - 8)
    .attr('y', d => (y(d.id) || 0) + y.bandwidth() / 2)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .style('fill', theme.text)
    .style('font-size', '11px')
    .text(d => truncateLabel(d.label, LABEL_MARGIN - 16))

  // Background bars
  svg.selectAll('.gantt-bg')
    .data(sorted)
    .join('rect')
    .attr('class', 'gantt-bg')
    .attr('x', d => x(parseDate(d.start)))
    .attr('y', d => y(d.id) || 0)
    .attr('width', d => Math.max(2, x(parseDate(d.end)) - x(parseDate(d.start))))
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .attr('fill', d => groupColor(d.group))
    .attr('opacity', 0.5)
    .style('cursor', config?.onBarClick ? 'pointer' : 'default')
    .on('click', (e, d) => config?.onBarClick?.(d))
    .on('mouseover', (e: MouseEvent, d) => {
      const pct = d.progress != null ? `${d.progress}%` : 'N/A'
      showTooltip(tooltip, e,
        `<b>${d.label}</b><br/>` +
        `${d.group}<br/>` +
        `${formatDate(String(d.start), 'medium')} - ${formatDate(String(d.end), 'medium')}<br/>` +
        `Progress: ${pct}`)
    })
    .on('mousemove', (e: MouseEvent) => moveTooltip(tooltip, e))
    .on('mouseout', () => hideTooltip(tooltip))

  // Progress overlay bars
  svg.selectAll('.gantt-progress')
    .data(sorted.filter(d => d.progress != null && d.progress > 0))
    .join('rect')
    .attr('class', 'gantt-progress')
    .attr('x', d => x(parseDate(d.start)))
    .attr('y', d => y(d.id) || 0)
    .attr('width', d => {
      const full = Math.max(2, x(parseDate(d.end)) - x(parseDate(d.start)))
      return full * (d.progress! / 100)
    })
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .attr('fill', d => d3.color(groupColor(d.group))?.darker(0.8)?.toString() || groupColor(d.group))
    .attr('opacity', 0.85)
    .style('pointer-events', 'none')

  // Today marker
  if (config?.showToday !== false) {
    const now = new Date()
    if (now >= xMin && now <= xMax) {
      svg.append('line')
        .attr('x1', x(now)).attr('x2', x(now))
        .attr('y1', margin.top).attr('y2', height - margin.bottom)
        .style('stroke', theme.error)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '6,3')
    }
  }

  return {
    cleanup: () => { svg.remove(); tooltip.remove() },
    svg: svg as any,
  }
}
