/**
 * darn3 — Pipeline Flow Renderer
 *
 * Simplified Sankey-style diagram for visualizing multi-stage data pipelines.
 * Nodes represent processing stages; links show data flow between them.
 * Includes a category legend and interactive hover/click behaviors.
 *
 * Uses the same FlowData type as the Sankey renderer but with a more
 * pipeline-oriented layout (wider margins for labels, stage legend).
 *
 * @module darn3/renderers/pipelineFlow
 * @category Renderer
 */

import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { getTheme, PALETTE, hashColor } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import type { PipelineFlowData, PipelineFlowConfig, D3RenderResult } from '../core/types'

/**
 * Render a pipeline flow diagram into a container element.
 *
 * Creates a left-to-right flow visualization with:
 * - Nodes sized by aggregate link value
 * - Links colored by source node category
 * - Hover tooltips on nodes and links
 * - Category legend at the bottom
 * - Click handler for node interaction
 *
 * Node colors are derived deterministically from the node's category
 * string using the darn3 palette, ensuring consistent colors across renders.
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Pipeline flow data with categorized nodes and weighted links
 * @param config - Optional layout and interaction configuration
 * @returns Render result with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * import { renderPipelineFlow } from '@/lib/darn3/renderers/pipelineFlow'
 *
 * const result = renderPipelineFlow(el, {
 *   nodes: [
 *     { name: 'Ingest', category: 'input' },
 *     { name: 'Transform', category: 'process' },
 *     { name: 'Store', category: 'output' },
 *   ],
 *   links: [
 *     { source: 'Ingest', target: 'Transform', value: 100 },
 *     { source: 'Transform', target: 'Store', value: 95 },
 *   ],
 * })
 *
 * // Later: result.cleanup()
 * ```
 */
export function renderPipelineFlow(
  container: HTMLElement,
  data: PipelineFlowData,
  config?: PipelineFlowConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data?.nodes?.length || !data?.links?.length) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No pipeline flow data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config?.width || container.clientWidth || 700
  const height = config?.height || 400
  const nodeWidth = config?.nodeWidth ?? 18
  const nodePadding = config?.nodePadding ?? 12
  const margin = { top: 10, right: 100, bottom: 10, left: 100 }

  // Build node index map: name -> index
  const nodeIndexMap = new Map<string, number>()
  data.nodes.forEach((n, i) => nodeIndexMap.set(n.name, i))

  // Convert string-based links to index-based for d3-sankey
  const indexedLinks = data.links
    .filter(l => nodeIndexMap.has(l.source) && nodeIndexMap.has(l.target))
    .map(l => ({
      source: nodeIndexMap.get(l.source)!,
      target: nodeIndexMap.get(l.target)!,
      value: l.value,
    }))

  if (indexedLinks.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No valid pipeline links</p>'
    return { cleanup: () => {} }
  }

  // Collect unique categories for consistent coloring
  const categories = [...new Set(data.nodes.map(n => n.category))]
  const categoryColors = new Map<string, string>()
  categories.forEach((cat, i) => {
    categoryColors.set(cat, PALETTE[i % PALETTE.length])
  })

  /**
   * Get the color for a node based on its category.
   * @param d - Sankey node (with category property)
   * @returns CSS color string
   */
  function nodeColor(d: any): string {
    return categoryColors.get(d.category) || hashColor(d.category || d.name)
  }

  // Build sankey layout
  const sankeyGenerator = sankey<any, any>()
    .nodeWidth(nodeWidth)
    .nodePadding(nodePadding)
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .nodeId((d: any) => d.index)

  const sankeyData = sankeyGenerator({
    nodes: data.nodes.map((n, i) => ({ ...n, index: i })),
    links: indexedLinks.map(l => ({ ...l })),
  })

  const { nodes, links } = sankeyData

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const tooltip = createTooltip(container)

  // Draw links
  svg.append('g')
    .attr('class', 'pipeline-links')
    .attr('fill', 'none')
    .selectAll('path')
    .data(links)
    .join('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', (d: any) => nodeColor(d.source))
    .attr('stroke-width', (d: any) => Math.max(2, d.width))
    .attr('stroke-opacity', 0.3)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event: any, d: any) {
      d3.select(this).attr('stroke-opacity', 0.6).attr('stroke-width', Math.max(4, d.width))
      const src = d.source?.name || d.source
      const tgt = d.target?.name || d.target
      showTooltip(tooltip, event,
        `<strong>${src}</strong> &rarr; <strong>${tgt}</strong><br>` +
        `Flow: <strong>${d.value}</strong>`)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseleave', function (_event: any, d: any) {
      d3.select(this).attr('stroke-opacity', 0.3).attr('stroke-width', Math.max(2, d.width))
      hideTooltip(tooltip)
    })

  // Draw nodes
  const nodeGroups = svg.append('g')
    .attr('class', 'pipeline-nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')

  // Node rects
  nodeGroups.append('rect')
    .attr('x', (d: any) => d.x0)
    .attr('y', (d: any) => d.y0)
    .attr('width', (d: any) => Math.max(1, d.x1 - d.x0))
    .attr('height', (d: any) => Math.max(1, d.y1 - d.y0))
    .attr('rx', 3)
    .attr('fill', (d: any) => nodeColor(d))
    .attr('stroke', theme.border)
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event: any, d: any) {
      d3.select(this).attr('stroke-width', 2).attr('opacity', 0.85)
      showTooltip(tooltip, event,
        `<strong>${d.name}</strong><br>` +
        `Category: ${d.category}<br>` +
        `In: ${d.targetLinks?.length || 0} | Out: ${d.sourceLinks?.length || 0}`)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseleave', function () {
      d3.select(this).attr('stroke-width', 0.5).attr('opacity', 1)
      hideTooltip(tooltip)
    })
    .on('click', function (_event: any, d: any) {
      config?.onNodeClick?.(d)
    })

  // Node labels: left-aligned for left nodes, right-aligned for right nodes
  nodeGroups.append('text')
    .attr('x', (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr('y', (d: any) => (d.y0 + d.y1) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
    .attr('fill', theme.text)
    .attr('font-size', '12px')
    .attr('font-weight', '500')
    .text((d: any) => d.name)

  // Category legend at bottom
  const legendEntries = [...categoryColors.entries()]
  const legendY = height - 4
  const legendSpacing = 110
  const legendStartX = (width - legendEntries.length * legendSpacing) / 2

  legendEntries.forEach(([label, color], i) => {
    const lx = legendStartX + i * legendSpacing
    svg.append('rect')
      .attr('x', lx).attr('y', legendY - 8)
      .attr('width', 10).attr('height', 10)
      .attr('rx', 2).attr('fill', color)
    svg.append('text')
      .attr('x', lx + 14).attr('y', legendY)
      .attr('font-size', '10px')
      .attr('fill', theme.textSecondary)
      .text(label)
  })

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
