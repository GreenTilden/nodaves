/**
 * darn3 — Streamgraph Renderer
 *
 * Stacked area chart with a wiggle baseline for visualizing how multiple
 * series evolve over time. Uses d3.stackOffsetWiggle for the classic
 * streamgraph aesthetic. Useful for volume-over-time, category trends,
 * resource allocation timelines, or any multi-series temporal data.
 *
 * @module darn3/renderers/streamgraph
 * @category Renderer
 *
 * @example
 * ```ts
 * import { renderStreamgraph } from '@/lib/darn3/renderers/streamgraph'
 *
 * const data: TimeSeriesStack = {
 *   labels: ['2026-01', '2026-02', '2026-03', '2026-04'],
 *   series: [
 *     { label: 'Frontend', values: [10, 15, 12, 18] },
 *     { label: 'Backend',  values: [8, 12, 20, 14] },
 *     { label: 'DevOps',   values: [5, 7, 6, 9] },
 *   ],
 * }
 *
 * const { cleanup } = renderStreamgraph(container, data, {
 *   animate: true,
 *   onLayerClick: (label) => console.log('Clicked:', label),
 * })
 * ```
 */

import * as d3 from 'd3'
import { getTheme, PALETTE } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import { formatNumber } from '../core/utils'
import type { TimeSeriesStack, StreamConfig, D3RenderResult } from '../core/types'

/**
 * Render a streamgraph (stacked wiggle area chart) visualization.
 *
 * Maps a {@link TimeSeriesStack} into layered area paths with the
 * d3 wiggle offset. Each series becomes a colored band whose thickness
 * at any x-position encodes its value. Optionally animates from flat
 * baseline on first render.
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Time series data with labels and stacked series
 * @param config - Layout, animation, and interaction configuration
 * @returns {@link D3RenderResult} with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * renderStreamgraph(el, data, {
 *   width: 800,
 *   height: 400,
 *   animate: true,
 *   onLayerHover: (label) => highlight(label),
 * })
 * ```
 */
export function renderStreamgraph(
  container: HTMLElement,
  data: TimeSeriesStack,
  config: StreamConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data?.labels?.length || !data?.series?.length) {
    container.innerHTML =
      '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No stream data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config.width || container.clientWidth || 600
  const height = config.height || 300
  const margin = { top: 20, right: 20, bottom: 50, left: 40 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  // Build tabular data for d3.stack
  const keys = data.series.map(s => s.label)
  const tableData = data.labels.map((label, i) => {
    const row: Record<string, any> = { date: new Date(label) }
    for (const s of data.series) row[s.label] = s.values[i] || 0
    return row
  })

  const stack = d3.stack<Record<string, any>>()
    .keys(keys)
    .offset(d3.stackOffsetWiggle)
    .order(d3.stackOrderInsideOut)

  const stacked = stack(tableData)

  const x = d3.scaleTime()
    .domain(d3.extent(tableData, d => d.date) as [Date, Date])
    .range([0, innerW])

  const yMin = d3.min(stacked, layer => d3.min(layer, d => d[0])) ?? 0
  const yMax = d3.max(stacked, layer => d3.max(layer, d => d[1])) ?? 1
  const y = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0])

  // Use per-series colors if provided, otherwise fall back to PALETTE
  const seriesColors = data.series.map((s, i) => s.color || PALETTE[i % PALETTE.length])
  const color = d3.scaleOrdinal<string>().domain(keys).range(seriesColors)

  const area = d3.area<d3.SeriesPoint<Record<string, any>>>()
    .x(d => x(d.data.date))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCardinal)

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const tooltip = createTooltip(container)

  // X axis
  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6))
    .selectAll('text').attr('fill', theme.textSecondary).attr('font-size', '10px')

  // Flat baseline for entry animation
  const flatArea = d3.area<d3.SeriesPoint<Record<string, any>>>()
    .x(d => x(d.data.date))
    .y0(() => y(0))
    .y1(() => y(0))
    .curve(d3.curveCardinal)

  // Layers
  const layers = g.selectAll('.stream-layer')
    .data(stacked)
    .join('path')
    .attr('class', 'stream-layer')
    .attr('fill', d => color(d.key))
    .attr('opacity', 0.65)
    .attr('d', config.animate ? flatArea as any : area as any)
    .on('mouseover', function (event: any, d) {
      d3.select(this).attr('opacity', 0.8)
      config.onLayerHover?.(d.key)
      const total = d3.sum(data.series.find(s => s.label === d.key)?.values || [])
      showTooltip(tooltip, event,
        `<strong>${d.key}</strong><br>Total: ${formatNumber(total)}`)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseout', function () {
      d3.select(this).attr('opacity', 0.65)
      config.onLayerHover?.(null)
      hideTooltip(tooltip)
    })
    .on('click', (_, d) => config.onLayerClick?.(d.key))

  if (config.animate) {
    layers.transition().duration(1000).attr('d', area as any)
  }

  // Legend at bottom
  const legendY = height - 16
  const legendG = svg.append('g').attr('transform', `translate(${margin.left},${legendY})`)
  let lx = 0
  for (const key of keys) {
    const item = legendG.append('g').attr('transform', `translate(${lx},0)`)
    item.append('circle').attr('r', 4).attr('cx', 4).attr('cy', -2).attr('fill', color(key))
    item.append('text')
      .attr('x', 12).attr('y', 0).attr('font-size', '10px')
      .attr('fill', theme.textSecondary).text(key)
    lx += key.length * 7 + 24
  }

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
