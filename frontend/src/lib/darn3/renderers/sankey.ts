/**
 * darn3 — Sankey Flow Diagram Renderer
 *
 * Multi-column flow visualization with gradient-colored links.
 * Nodes are positioned by the d3-sankey layout engine; links show
 * value flow between categories. Supports hover tooltips and click handlers.
 *
 * @module darn3/renderers/sankey
 * @category Renderer
 */

import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { getTheme, hashColor } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import type { FlowData, SankeyConfig, D3RenderResult } from '../core/types'

/**
 * Resolve a node color from its category string.
 * Uses the theme for known semantic categories, falls back to
 * deterministic hash coloring for arbitrary category values.
 *
 * @param category - Node category string
 * @param theme - Current D3 theme
 * @returns CSS color string
 */
function nodeColor(category: string, theme: ReturnType<typeof getTheme>): string {
  return hashColor(category)
}

/**
 * Render a Sankey flow diagram into a container element.
 *
 * Nodes are laid out in columns based on their link structure.
 * Links are drawn with gradient strokes from source to target color.
 * Node height is proportional to the sum of connected link values.
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Flow data with named nodes and weighted links
 * @param config - Optional layout and interaction configuration
 * @returns Render result with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * import { renderSankey } from '@/lib/darn3/renderers/sankey'
 *
 * const result = renderSankey(el, {
 *   nodes: [
 *     { name: 'Source A', category: 'input' },
 *     { name: 'Process', category: 'transform' },
 *     { name: 'Output X', category: 'output' },
 *   ],
 *   links: [
 *     { source: 'Source A', target: 'Process', value: 10 },
 *     { source: 'Process', target: 'Output X', value: 8 },
 *   ],
 * })
 *
 * // Later: result.cleanup()
 * ```
 */
export function renderSankey(
  container: HTMLElement,
  data: FlowData,
  config?: SankeyConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data?.nodes?.length || !data?.links?.length) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No flow data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config?.width || container.clientWidth || 700
  const height = config?.height || 400
  const margin = { top: 10, right: 10, bottom: 10, left: 10 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  // Build node index map
  const nodeIndex = new Map<string, number>()
  data.nodes.forEach((n, i) => nodeIndex.set(n.name, i))

  const sankeyNodes = data.nodes.map(n => ({ ...n }))
  const sankeyLinks = data.links
    .filter(l => nodeIndex.has(l.source) && nodeIndex.has(l.target))
    .map(l => ({
      source: nodeIndex.get(l.source)!,
      target: nodeIndex.get(l.target)!,
      value: l.value,
    }))

  const sankeyGen = sankey()
    .nodeWidth(config?.nodeWidth || 20)
    .nodePadding(config?.nodePadding || 14)
    .extent([[0, 0], [innerW, innerH]])

  const graph = sankeyGen({
    nodes: sankeyNodes.map(d => ({ ...d })) as any,
    links: sankeyLinks.map(d => ({ ...d })),
  })

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const tooltip = createTooltip(container)
  const defs = svg.append('defs')

  // Link gradients + paths
  g.selectAll('.sankey-link')
    .data(graph.links)
    .join('path')
    .attr('class', 'sankey-link')
    .attr('d', sankeyLinkHorizontal() as any)
    .attr('fill', 'none')
    .attr('stroke-width', (d: any) => Math.max(1, d.width))
    .each(function (d: any, i: number) {
      const srcColor = nodeColor((d.source as any).category, theme)
      const tgtColor = nodeColor((d.target as any).category, theme)
      const gradId = `sankey-grad-${i}`
      const grad = defs.append('linearGradient')
        .attr('id', gradId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', (d.source as any).x1)
        .attr('x2', (d.target as any).x0)
      grad.append('stop').attr('offset', '0%').attr('stop-color', srcColor)
      grad.append('stop').attr('offset', '100%').attr('stop-color', tgtColor)
      d3.select(this).attr('stroke', `url(#${gradId})`)
    })
    .attr('stroke-opacity', 0.35)
    .on('mouseover', function (event: any, d: any) {
      d3.select(this).attr('stroke-opacity', 0.7)
      showTooltip(tooltip, event,
        `<strong>${(d.source as any).name}</strong> \u2192 ` +
        `<strong>${(d.target as any).name}</strong><br>` +
        `Value: ${d.value}`)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseout', function () {
      d3.select(this).attr('stroke-opacity', 0.35)
      hideTooltip(tooltip)
    })

  // Nodes
  g.selectAll('.sankey-node')
    .data(graph.nodes)
    .join('rect')
    .attr('class', 'sankey-node')
    .attr('x', (d: any) => d.x0)
    .attr('y', (d: any) => d.y0)
    .attr('width', (d: any) => d.x1 - d.x0)
    .attr('height', (d: any) => Math.max(1, d.y1 - d.y0))
    .attr('fill', (d: any) => nodeColor(d.category, theme))
    .attr('stroke', theme.border)
    .attr('rx', 2)
    .on('mouseover', (event: any, d: any) => {
      config?.onNodeHover?.(d)
      showTooltip(tooltip, event,
        `<strong>${d.name}</strong><br>Category: ${d.category}<br>Value: ${d.value ?? ''}`)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseout', () => { config?.onNodeHover?.(null); hideTooltip(tooltip) })
    .on('click', (_, d: any) => config?.onNodeClick?.(d))

  // Node labels
  g.selectAll('.sankey-label')
    .data(graph.nodes)
    .join('text')
    .attr('class', 'sankey-label')
    .attr('x', (d: any) => d.x0 < innerW / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr('y', (d: any) => (d.y0 + d.y1) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d: any) => d.x0 < innerW / 2 ? 'start' : 'end')
    .attr('font-size', '10px')
    .attr('fill', theme.textSecondary)
    .text((d: any) => d.name)

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
