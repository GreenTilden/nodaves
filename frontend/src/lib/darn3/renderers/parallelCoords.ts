/**
 * darn3 — Parallel Coordinates Renderer
 *
 * Multi-axis brushable visualization for comparing multi-dimensional data.
 * Each line represents one datum, axes represent dimensions, and lines are
 * colored by a score value using the Viridis color scale. Supports per-axis
 * brush filtering with selection callbacks.
 *
 * @module darn3/renderers/parallelCoords
 * @category Renderer
 */

import * as d3 from 'd3'
import { getTheme } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import type { ParallelDatum, ParallelConfig, D3RenderResult } from '../core/types'

/**
 * Render a parallel coordinates chart into a container element.
 *
 * Creates an interactive multi-axis visualization with:
 * - One vertical axis per dimension (numeric or categorical)
 * - Lines colored by score using the Viridis sequential scale
 * - Per-axis brush selection to filter and highlight subsets
 * - Hover tooltips showing all dimension values
 * - Score legend bar with min/max labels
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Array of data points with named dimensions
 * @param config - Axes, dimensions, and interaction configuration
 * @returns Render result with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * import { renderParallelCoords } from '@/lib/darn3/renderers/parallelCoords'
 *
 * const result = renderParallelCoords(el, [
 *   { id: 'run-1', score: 0.85, alpha: 0.01, depth: 3, method: 'sgd' },
 *   { id: 'run-2', score: 0.92, alpha: 0.001, depth: 5, method: 'adam' },
 * ], {
 *   axes: ['alpha', 'depth', 'method'],
 *   onBrushChange: (selected) => console.log('Selected:', selected),
 * })
 *
 * // Later: result.cleanup()
 * ```
 */
export function renderParallelCoords(
  container: HTMLElement,
  data: ParallelDatum[],
  config: ParallelConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data?.length) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config.width || container.clientWidth || 700
  const height = config.height || 400
  const margin = { top: 30, right: 20, bottom: 10, left: 20 }
  const h = height - margin.top - margin.bottom

  // Score color scale
  const scoreExtent = d3.extent(data, d => d.score) as [number, number]
  const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain([scoreExtent[0] ?? 0, scoreExtent[1] ?? 1])

  // Y scale per axis: linear for numbers, point for strings
  const yScales: Record<string, d3.ScaleLinear<number, number> | d3.ScalePoint<string>> = {}

  for (const axis of config.axes) {
    const values = data.map(d => d[axis])
    const isNumeric = values.every(v => typeof v === 'number' || v === undefined)

    if (isNumeric) {
      const ext = d3.extent(values as number[]) as [number, number]
      yScales[axis] = d3.scaleLinear()
        .domain([ext[0] ?? 0, ext[1] ?? 1])
        .range([h, 0])
        .nice()
    } else {
      const domain = [...new Set(values.map(String))].sort()
      yScales[axis] = d3.scalePoint<string>()
        .domain(domain)
        .range([h, 0])
        .padding(0.2)
    }
  }

  // X scale: axis positions
  const xScale = d3.scalePoint<string>()
    .domain(config.axes)
    .range([margin.left, width - margin.right])
    .padding(0.05)

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const g = svg.append('g')
    .attr('transform', `translate(0,${margin.top})`)

  const tooltip = createTooltip(container)

  /**
   * Generate the SVG path string for a single datum across all axes.
   * @param d - Data point to trace
   * @returns SVG path string
   */
  function linePath(d: ParallelDatum): string {
    return d3.line<string>()(
      config.axes.map(axis => {
        const x = xScale(axis)!
        const scale = yScales[axis]
        const val = d[axis]
        let y: number
        if ('invert' in scale) {
          y = (scale as d3.ScaleLinear<number, number>)(val as number)
        } else {
          y = (scale as d3.ScalePoint<string>)(String(val)) ?? h / 2
        }
        return [x, y] as unknown as string
      }) as any
    ) || ''
  }

  // Draw data lines
  const lines = g.append('g')
    .attr('fill', 'none')
    .attr('stroke-width', 1.5)
    .selectAll('path')
    .data(data)
    .join('path')
    .attr('d', linePath)
    .attr('stroke', d => colorScale(d.score))
    .attr('stroke-opacity', 0.3)
    .style('cursor', 'pointer')

  // Brush state
  const brushSelections = new Map<string, [number, number] | null>()

  /**
   * Check whether a datum falls within all active brush selections.
   * @param d - Data point to test
   * @returns true if the datum passes all brush filters
   */
  function isSelected(d: ParallelDatum): boolean {
    for (const [axis, range] of brushSelections) {
      if (!range) continue
      const scale = yScales[axis]
      const val = d[axis]
      let y: number
      if ('invert' in scale) {
        y = (scale as d3.ScaleLinear<number, number>)(val as number)
      } else {
        y = (scale as d3.ScalePoint<string>)(String(val)) ?? 0
      }
      if (y < range[0] || y > range[1]) return false
    }
    return true
  }

  /** Update line opacity based on current brush selections */
  function updateSelection() {
    const activeBrushes = [...brushSelections.values()].filter(v => v !== null)
    if (activeBrushes.length === 0) {
      lines.attr('stroke-opacity', 0.3)
      config.onBrushChange?.([])
      return
    }

    const selected: ParallelDatum[] = []
    lines.attr('stroke-opacity', (d: ParallelDatum) => {
      const sel = isSelected(d)
      if (sel) selected.push(d)
      return sel ? 0.8 : 0.05
    })
    config.onBrushChange?.(selected)
  }

  // Draw axes + brushes
  const axisGroups = g.selectAll('.pc-axis')
    .data(config.axes)
    .join('g')
    .attr('class', 'pc-axis')
    .attr('transform', (axis: string) => `translate(${xScale(axis)},0)`)

  axisGroups.each(function (axis: string) {
    const scale = yScales[axis]
    const axisGen = 'invert' in scale
      ? d3.axisLeft(scale as d3.ScaleLinear<number, number>).ticks(5)
      : d3.axisLeft(scale as d3.ScalePoint<string>)

    d3.select(this)
      .call(axisGen as any)
      .selectAll('text')
      .attr('fill', theme.textSecondary)
      .attr('font-size', '9px')

    d3.select(this)
      .selectAll('.domain, .tick line')
      .attr('stroke', theme.border)

    // Brush per axis
    const brush = d3.brushY()
      .extent([[-12, 0], [12, h]])
      .on('brush end', function (event: any) {
        brushSelections.set(axis, event.selection)
        updateSelection()
      })

    d3.select(this)
      .append('g')
      .attr('class', 'brush')
      .call(brush)
  })

  // Axis labels at top
  axisGroups.append('text')
    .attr('y', -12)
    .attr('text-anchor', 'middle')
    .attr('fill', theme.text)
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .text((axis: string) => axis.replace(/_/g, ' '))

  // Hover interactions
  lines
    .on('mouseenter', function (_event: any, d: ParallelDatum) {
      lines.attr('stroke-opacity', (v: ParallelDatum) => v === d ? 0.9 : 0.05)
      d3.select(this).attr('stroke-width', 3)
    })
    .on('mousemove', function (event: any, d: ParallelDatum) {
      const params = config.axes
        .map(a => `${a.replace(/_/g, ' ')}: <strong>${typeof d[a] === 'number' ? (d[a] as number).toFixed(3) : d[a]}</strong>`)
        .join('<br>')
      showTooltip(tooltip, event,
        `<strong>${d.id}</strong><br>` +
        `Score: <strong>${d.score.toFixed(4)}</strong><br>` +
        `<hr style="border-color:${theme.border};margin:4px 0">` +
        params)
      moveTooltip(tooltip, event)
    })
    .on('mouseleave', function () {
      const activeBrushes = [...brushSelections.values()].filter(v => v !== null)
      if (activeBrushes.length > 0) {
        updateSelection()
      } else {
        lines.attr('stroke-opacity', 0.3)
      }
      d3.select(this).attr('stroke-width', 1.5)
      hideTooltip(tooltip)
    })
    .on('click', function (_event: any, d: ParallelDatum) {
      config.onLineClick?.(d)
    })

  // Score legend
  const legendW = 100
  const legendH = 8
  const legendX = width - margin.right - legendW
  const legendY = 8
  const defs = svg.append('defs')
  const gradient = defs.append('linearGradient').attr('id', 'pc-score-legend')
  gradient.append('stop').attr('offset', '0%').attr('stop-color', colorScale(scoreExtent[0]))
  gradient.append('stop').attr('offset', '100%').attr('stop-color', colorScale(scoreExtent[1]))

  svg.append('rect')
    .attr('x', legendX).attr('y', legendY)
    .attr('width', legendW).attr('height', legendH)
    .attr('rx', 2).attr('fill', 'url(#pc-score-legend)')

  svg.append('text').attr('x', legendX).attr('y', legendY + legendH + 10)
    .attr('font-size', '9px').attr('fill', theme.textSecondary)
    .text(scoreExtent[0].toFixed(2))
  svg.append('text').attr('x', legendX + legendW).attr('y', legendY + legendH + 10)
    .attr('font-size', '9px').attr('fill', theme.textSecondary)
    .attr('text-anchor', 'end').text(scoreExtent[1].toFixed(2))

  // Data count badge
  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 14)
    .attr('font-size', '11px')
    .attr('fill', theme.textSecondary)
    .text(`${data.length} items`)

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
