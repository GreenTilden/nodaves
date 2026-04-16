/**
 * darn3 — Chord Diagram Renderer
 *
 * Circular chord diagram showing relationships between categories.
 * Arcs represent categories; ribbons represent co-occurrence strength.
 * Supports interactive highlighting on hover and optional click callbacks.
 *
 * @module darn3/renderers/chord
 * @category Renderer
 */

import * as d3 from 'd3'
import { getTheme, PALETTE } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import type { ChordData, ChordConfig, D3RenderResult } from '../core/types'

/**
 * Render a circular chord diagram into a container element.
 *
 * The diagram shows pairwise relationships between labeled categories
 * using a square adjacency matrix. Arcs around the perimeter represent
 * categories; ribbons connecting arcs represent relationship strength.
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Chord data with labels, matrix, and optional details
 * @param config - Layout and interaction configuration
 * @returns Render result with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * import { renderChordDiagram } from '@/lib/darn3/renderers/chord'
 *
 * const result = renderChordDiagram(el, {
 *   labels: ['A', 'B', 'C'],
 *   matrix: [
 *     [0, 5, 3],
 *     [5, 0, 2],
 *     [3, 2, 0],
 *   ],
 * }, { width: 500, height: 500 })
 *
 * // Later: result.cleanup()
 * ```
 */
export function renderChordDiagram(
  container: HTMLElement,
  data: ChordData,
  config: ChordConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data?.labels?.length || !data?.matrix?.length) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No chord data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config.width || container.clientWidth || 500
  const height = config.height || 500
  const outerRadius = Math.min(width, height) * 0.4
  const innerRadius = outerRadius - 20

  const color = d3.scaleOrdinal<string, string>()
    .domain(d3.range(data.labels.length).map(String))
    .range(PALETTE)

  const chord = d3.chord()
    .padAngle(0.05)
    .sortSubgroups(d3.descending)

  const chords = chord(data.matrix)

  const arc = d3.arc<d3.ChordGroup>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)

  const ribbon = d3.ribbon<any, d3.ChordSubgroup>()
    .radius(innerRadius)

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)

  const tooltip = createTooltip(container)

  // Ribbons
  const ribbons = g.selectAll('.ribbon')
    .data(chords)
    .join('path')
    .attr('class', 'ribbon')
    .attr('d', ribbon as any)
    .attr('fill', d => color(String(d.source.index)))
    .attr('fill-opacity', 0.5)
    .attr('stroke', 'none')
    .on('mouseover', function (event: any, d) {
      ribbons.attr('fill-opacity', 0.05)
      d3.select(this).attr('fill-opacity', 0.75)
      const src = data.labels[d.source.index]
      const tgt = data.labels[d.target.index]
      const key = `${src}|${tgt}`
      const details = data.details?.[key] || data.details?.[`${tgt}|${src}`] || []
      showTooltip(tooltip, event,
        `<strong>${src}</strong> \u2194 <strong>${tgt}</strong><br>` +
        `Co-occurrences: ${d.source.value}` +
        (details.length ? `<br>${details.slice(0, 3).join('<br>')}` : ''))
      config.onChordClick?.(src, tgt, details)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseout', () => {
      ribbons.attr('fill-opacity', 0.5)
      hideTooltip(tooltip)
    })

  // Arcs
  g.selectAll('.arc')
    .data(chords.groups)
    .join('path')
    .attr('class', 'arc')
    .attr('d', arc as any)
    .attr('fill', d => color(String(d.index)))
    .attr('stroke', theme.border)
    .on('mouseover', function (event: any, d) {
      ribbons.attr('fill-opacity', (r: any) =>
        r.source.index === d.index || r.target.index === d.index ? 0.75 : 0.05
      )
      config.onArcHover?.(data.labels[d.index])
      showTooltip(tooltip, event,
        `<strong>${data.labels[d.index]}</strong><br>Total: ${d.value}`)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseout', () => {
      ribbons.attr('fill-opacity', 0.5)
      config.onArcHover?.(null)
      hideTooltip(tooltip)
    })
    .on('click', (_, d) => config.onArcClick?.(data.labels[d.index], d.index))

  // Arc labels
  g.selectAll('.arc-label')
    .data(chords.groups)
    .join('text')
    .attr('class', 'arc-label')
    .each(function (d) {
      const angle = (d.startAngle + d.endAngle) / 2
      const flip = angle > Math.PI
      const labelRadius = outerRadius + 8
      d3.select(this)
        .attr('transform',
          `rotate(${(angle * 180) / Math.PI - 90}) translate(${labelRadius},0)` +
          (flip ? ' rotate(180)' : ''))
        .attr('text-anchor', flip ? 'end' : 'start')
    })
    .attr('font-size', '10px')
    .attr('fill', theme.textSecondary)
    .text(d => {
      const span = d.endAngle - d.startAngle
      const label = data.labels[d.index]
      return span < 0.15 ? label.slice(0, 3) : label
    })

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
