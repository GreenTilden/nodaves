/**
 * darn3 — Timeline Renderer
 *
 * Horizontal milestone timeline with shaped markers (diamond, square, circle)
 * plotted along a time axis. Supports category coloring, today marker,
 * click callbacks, and a compact legend.
 *
 * @module darn3/renderers/timeline
 * @category Renderer
 *
 * @example
 * ```ts
 * import { renderTimeline } from '@/lib/darn3/renderers/timeline'
 *
 * const result = renderTimeline(container, [
 *   { id: '1', label: 'LLC Filed', date: '2026-03-01', shape: 'milestone', category: 'launch', status: 'completed' },
 *   { id: '2', label: 'Phase 2 Gate', date: '2026-04-01', shape: 'gate', category: 'foundation' },
 * ])
 * ```
 */

import * as d3 from 'd3'
import { getTheme, PALETTE, paletteColor } from '../core/theme'
import { hashColor } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import type { TimelineEvent, TimelineConfig, D3RenderResult } from '../core/types'
import { formatDate, formatNumber, truncateLabel, contrastText, parseDate } from '../core/utils'
import { PHASE_COLORS, STATUS_COLORS, ANIM, DEFAULT_MARGIN } from '../core/constants'

const MARKER_SIZE = 12
const TRACK_Y_RATIO = 0.4

/**
 * Render a horizontal milestone timeline.
 *
 * @param container - DOM element to render into
 * @param data - Array of TimelineEvent objects
 * @param config - Optional sizing, today marker, and event callbacks
 * @returns D3RenderResult with cleanup function and svg reference
 *
 * @example
 * ```ts
 * const { cleanup } = renderTimeline(el, events, {
 *   onEventClick: (evt) => router.push(`/milestones/${evt.id}`),
 * })
 * ```
 */
export function renderTimeline(
  container: HTMLElement,
  data: TimelineEvent[],
  config?: TimelineConfig
): D3RenderResult {
  const theme = getTheme(container)
  const width = config?.width || container.clientWidth || 700
  const height = config?.height || container.clientHeight || 180
  const margin = { top: 24, right: 24, bottom: 60, left: 24 }

  const sorted = [...data].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
  const categories = [...new Set(sorted.map(d => d.category))]

  const categoryColor = (cat: string): string => PHASE_COLORS[cat] || hashColor(cat)

  // Time scale
  const dates = sorted.map(d => parseDate(d.date))
  const pad = 86400000 * 3 // 3 day padding
  const x = d3.scaleTime()
    .domain([new Date(d3.min(dates)!.getTime() - pad), new Date(d3.max(dates)!.getTime() + pad)])
    .range([margin.left, width - margin.right])

  const trackY = margin.top + (height - margin.top - margin.bottom) * TRACK_Y_RATIO
  const tooltip = createTooltip(container)

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('overflow', 'visible')

  // Connecting line
  svg.append('line')
    .attr('x1', margin.left).attr('x2', width - margin.right)
    .attr('y1', trackY).attr('y2', trackY)
    .style('stroke', theme.border)
    .style('stroke-width', 2)

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${trackY + 30})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.selectAll('text').style('fill', theme.textSecondary).style('font-size', '10px'))
    .call(g => g.selectAll('line, path').style('stroke', theme.border))

  // Draw shape helper
  function drawMarker(sel: d3.Selection<SVGGElement, TimelineEvent, SVGSVGElement, unknown>) {
    // Diamond
    sel.filter(d => d.shape === 'diamond')
      .append('path')
      .attr('d', d3.symbol().type(d3.symbolDiamond).size(MARKER_SIZE * MARKER_SIZE)())
      .attr('fill', d => categoryColor(d.category))

    // Square
    sel.filter(d => d.shape === 'square')
      .append('rect')
      .attr('x', -MARKER_SIZE / 2).attr('y', -MARKER_SIZE / 2)
      .attr('width', MARKER_SIZE).attr('height', MARKER_SIZE)
      .attr('rx', 2)
      .attr('fill', d => categoryColor(d.category))

    // Circle
    sel.filter(d => d.shape === 'circle')
      .append('circle')
      .attr('r', MARKER_SIZE / 2)
      .attr('fill', d => categoryColor(d.category))
  }

  // Event markers
  const markers = svg.selectAll<SVGGElement, TimelineEvent>('.tl-marker')
    .data(sorted)
    .join('g')
    .attr('class', 'tl-marker')
    .attr('transform', d => `translate(${x(parseDate(d.date))},${trackY})`)
    .style('cursor', config?.onEventClick ? 'pointer' : 'default')

  drawMarker(markers)

  // Labels (rotated)
  markers.append('text')
    .attr('y', MARKER_SIZE + 6)
    .attr('text-anchor', 'start')
    .attr('transform', `rotate(45,0,${MARKER_SIZE + 6})`)
    .style('fill', theme.textSecondary)
    .style('font-size', '10px')
    .text(d => truncateLabel(d.label, 100))

  // Interactions
  markers
    .on('click', (e, d) => config?.onEventClick?.(d))
    .on('mouseover', (e: MouseEvent, d) => {
      const statusStr = d.status ? `<br/>Status: ${d.status}` : ''
      showTooltip(tooltip, e,
        `<b>${d.label}</b><br/>` +
        `${formatDate(d.date, 'medium')}<br/>` +
        `Category: ${d.category}${statusStr}`)
      config?.onEventHover?.(d)
    })
    .on('mousemove', (e: MouseEvent) => moveTooltip(tooltip, e))
    .on('mouseout', () => { hideTooltip(tooltip); config?.onEventHover?.(null) })

  // Today marker
  if (config?.showToday !== false) {
    const now = new Date()
    const [dMin, dMax] = x.domain()
    if (now >= dMin && now <= dMax) {
      svg.append('line')
        .attr('x1', x(now)).attr('x2', x(now))
        .attr('y1', margin.top - 4).attr('y2', trackY + 20)
        .style('stroke', theme.error).style('stroke-width', 1.5)

      svg.append('text')
        .attr('x', x(now)).attr('y', margin.top - 8)
        .attr('text-anchor', 'middle')
        .style('fill', theme.error).style('font-size', '9px').style('font-weight', 'bold')
        .text('TODAY')
    }
  }

  // Legend (top-right)
  const legend = svg.append('g')
    .attr('transform', `translate(${width - margin.right},${8})`)

  categories.forEach((cat, i) => {
    const g = legend.append('g').attr('transform', `translate(${-i * 90 - 10},0)`)
    g.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', categoryColor(cat))
    g.append('text').attr('x', 14).attr('y', 9).style('fill', theme.textSecondary).style('font-size', '10px').text(cat)
  })

  return {
    cleanup: () => { svg.remove(); tooltip.remove() },
    svg: svg as any,
  }
}
