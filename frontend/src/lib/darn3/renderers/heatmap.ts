/**
 * darn3 — Heatmap Renderer
 *
 * Renders a color-coded grid where rows and columns represent categories
 * and cell color encodes a numeric value. Useful for correlation matrices,
 * performance grids, feature-vs-category breakdowns, and any 2D metric table.
 *
 * @module darn3/renderers/heatmap
 * @category Renderer
 *
 * @example
 * ```ts
 * import { renderHeatmap } from '@/lib/darn3/renderers/heatmap'
 *
 * const cells: GridCell[] = [
 *   { row: 'Feature A', col: 'Region 1', value: 72.5 },
 *   { row: 'Feature A', col: 'Region 2', value: 45.0 },
 *   { row: 'Feature B', col: 'Region 1', value: 88.3 },
 *   { row: 'Feature B', col: 'Region 2', value: 51.2 },
 * ]
 *
 * const { cleanup } = renderHeatmap(container, cells, {
 *   domain: [30, 90],
 * })
 *
 * // Later: cleanup()
 * ```
 */

import * as d3 from 'd3'
import { getTheme, PALETTE, paletteColor } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import { truncateLabel, formatNumber, contrastText } from '../core/utils'
import type { GridCell, HeatmapConfig, D3RenderResult } from '../core/types'

/**
 * Render a heatmap grid visualization.
 *
 * Maps an array of {@link GridCell} objects into a colored matrix.
 * Rows and columns are derived automatically from the data.
 * Color is mapped through a sequential interpolator (default: RdYlGn).
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Array of grid cells with row, col, and value
 * @param config - Optional layout and interaction configuration
 * @returns {@link D3RenderResult} with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * renderHeatmap(el, cells, {
 *   width: 800,
 *   domain: [0, 100],
 *   colorInterpolator: d3.interpolateViridis,
 *   onCellClick: (cell) => console.log('Clicked:', cell),
 * })
 * ```
 */
export function renderHeatmap(
  container: HTMLElement,
  data: GridCell[],
  config?: HeatmapConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data?.length) {
    container.innerHTML =
      '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No grid data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config?.width || container.clientWidth || 600

  const cols = [...new Set(data.map(d => d.col))]
  const rows = [...new Set(data.map(d => d.row))]

  const cellW = Math.min(80, (width - 160) / cols.length)
  const cellH = 22
  const leftMargin = 160
  const topMargin = 40
  const height = config?.height || topMargin + rows.length * cellH + 20

  // Color scale — configurable interpolator and domain
  const interpolator = config?.colorInterpolator || d3.interpolateRdYlGn
  const domain = config?.domain || [35, 75]
  const colorScale = d3.scaleSequential(interpolator).domain(domain)

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const tooltip = createTooltip(container)

  // Column headers
  svg.selectAll('.col-header')
    .data(cols)
    .join('text')
    .attr('x', (_, i) => leftMargin + i * cellW + cellW / 2)
    .attr('y', topMargin - 10)
    .attr('text-anchor', 'middle')
    .attr('fill', (_, i) => paletteColor(i))
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .text(d => truncateLabel(d, cellW))

  // Build lookup for O(1) cell access
  const lookup = new Map<string, GridCell>()
  for (const cell of data) {
    lookup.set(`${cell.row}|${cell.col}`, cell)
  }

  // Row groups
  const row = svg.selectAll('.row')
    .data(rows)
    .join('g')
    .attr('class', 'row')
    .attr('transform', (_, i) => `translate(0,${topMargin + i * cellH})`)

  // Row label
  row.append('text')
    .attr('x', leftMargin - 8)
    .attr('y', cellH / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('fill', theme.text)
    .attr('font-size', '11px')
    .text(d => d.replace(/_/g, ' '))

  // Cells per column
  for (let ci = 0; ci < cols.length; ci++) {
    const col = cols[ci]

    row.append('rect')
      .attr('x', leftMargin + ci * cellW + 2)
      .attr('y', 1)
      .attr('width', cellW - 4)
      .attr('height', cellH - 2)
      .attr('rx', 3)
      .attr('fill', (rowKey: string) => {
        const cell = lookup.get(`${rowKey}|${col}`)
        return cell ? colorScale(cell.value) : theme.surface
      })
      .attr('stroke', theme.border)
      .attr('stroke-width', 0.5)
      .style('cursor', config?.onCellClick ? 'pointer' : 'default')
      .on('mouseover', function (event: any, rowKey: string) {
        const cell = lookup.get(`${rowKey}|${col}`)
        if (cell) {
          const meta = cell.metadata || {}
          let html = `<strong>${rowKey.replace(/_/g, ' ')}</strong> \u2014 ${col}`
          html += `<br>Value: <strong>${formatNumber(cell.value, { decimals: 1 })}</strong>`
          for (const [k, v] of Object.entries(meta)) {
            html += `<br>${k}: ${v}`
          }
          showTooltip(tooltip, event, html)
        }
      })
      .on('mousemove', (event: any) => moveTooltip(tooltip, event))
      .on('mouseout', () => hideTooltip(tooltip))
      .on('click', (_event: any, rowKey: string) => {
        const cell = lookup.get(`${rowKey}|${col}`)
        if (cell && config?.onCellClick) config.onCellClick(cell)
      })

    // Value label inside cell
    row.append('text')
      .attr('x', leftMargin + ci * cellW + cellW / 2)
      .attr('y', cellH / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', (rowKey: string) => {
        const cell = lookup.get(`${rowKey}|${col}`)
        if (!cell) return theme.text
        const bg = colorScale(cell.value)
        return contrastText(typeof bg === 'string' ? bg : '#333333')
      })
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .text((rowKey: string) => {
        const cell = lookup.get(`${rowKey}|${col}`)
        return cell ? formatNumber(cell.value, { decimals: 0 }) : ''
      })
  }

  // Color legend
  const legendW = 120
  const legendH = 8
  const legendX = leftMargin
  const legendY = topMargin + rows.length * cellH + 8
  const defs = svg.append('defs')
  const gradientId = `darn3-heatmap-legend-${Math.random().toString(36).slice(2, 8)}`
  const gradient = defs.append('linearGradient').attr('id', gradientId)
  gradient.append('stop').attr('offset', '0%').attr('stop-color', colorScale(domain[0]))
  gradient.append('stop').attr('offset', '50%').attr('stop-color', colorScale((domain[0] + domain[1]) / 2))
  gradient.append('stop').attr('offset', '100%').attr('stop-color', colorScale(domain[1]))

  svg.append('rect')
    .attr('x', legendX).attr('y', legendY)
    .attr('width', legendW).attr('height', legendH)
    .attr('rx', 2).attr('fill', `url(#${gradientId})`)

  svg.append('text').attr('x', legendX).attr('y', legendY + legendH + 10)
    .attr('font-size', '9px').attr('fill', theme.textSecondary)
    .text(String(domain[0]))
  svg.append('text').attr('x', legendX + legendW).attr('y', legendY + legendH + 10)
    .attr('font-size', '9px').attr('fill', theme.textSecondary).attr('text-anchor', 'end')
    .text(`${domain[1]}+`)

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
