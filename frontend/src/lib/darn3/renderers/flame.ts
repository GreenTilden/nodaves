/**
 * darn3 — Flame / Icicle Chart Renderer
 *
 * Top-down partition chart (icicle layout) for hierarchical data.
 * Depth 0 (root) is hidden; depth 1 nodes span the full width as group
 * bands; depth 2+ nodes are proportionally sized within their parent.
 * Useful for feature importance, CPU flame graphs, cost breakdowns,
 * or any hierarchical weight distribution.
 *
 * @module darn3/renderers/flame
 * @category Renderer
 *
 * @example
 * ```ts
 * import { renderFlame } from '@/lib/darn3/renderers/flame'
 *
 * const data: HierarchyNode = {
 *   name: 'Root',
 *   children: [
 *     { name: 'Group A', children: [
 *       { name: 'Feature X', value: 0.35 },
 *       { name: 'Feature Y', value: 0.15 },
 *     ]},
 *     { name: 'Group B', children: [
 *       { name: 'Feature Z', value: 0.50 },
 *     ]},
 *   ],
 * }
 *
 * const { cleanup } = renderFlame(container, data, { height: 300 })
 * ```
 */

import * as d3 from 'd3'
import { getTheme, PALETTE } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import { truncateLabel, formatNumber } from '../core/utils'
import type { HierarchyNode, HierarchyConfig, D3RenderResult } from '../core/types'

/**
 * Render a flame / icicle chart visualization.
 *
 * Lays out a {@link HierarchyNode} tree as horizontal bands (top-down partition).
 * Width encodes proportional value within each depth level. Top-level
 * children are colored from the darn3 palette; deeper nodes inherit their
 * parent color with reduced opacity.
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Root node of the hierarchy tree
 * @param config - Optional layout, color, and interaction configuration
 * @returns {@link D3RenderResult} with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * renderFlame(el, root, {
 *   width: 700,
 *   height: 320,
 *   getColor: (node) => node.depth === 1 ? '#6366f1' : '#06d6a0',
 *   onNodeClick: (node) => console.log(node.data.name),
 * })
 * ```
 */
export function renderFlame(
  container: HTMLElement,
  data: HierarchyNode,
  config?: HierarchyConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data?.children?.length) {
    container.innerHTML =
      '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No hierarchy data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config?.width || container.clientWidth || 700
  const height = config?.height || 320

  const root = d3.hierarchy<HierarchyNode>(data)
    .sum(d => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))

  const partition = d3.partition<HierarchyNode>()
    .size([width, height])
    .padding(1)

  partition(root)

  // Color: depth 1 from PALETTE, depth 2+ inherits parent with lower opacity
  const groupNames = root.children?.map(c => c.data.name) || []
  const groupColor = d3.scaleOrdinal<string>().domain(groupNames).range(PALETTE)

  /**
   * Determine fill color for a node based on depth.
   * @param d - Partition node
   * @returns CSS color string
   */
  function cellColor(d: d3.HierarchyRectangularNode<HierarchyNode>): string {
    if (config?.getColor) return config.getColor(d)
    if (d.depth === 0) return 'transparent'
    if (d.depth === 1) return groupColor(d.data.name)
    // depth 2+: parent color with reduced opacity
    const parent = d.parent
    if (parent && parent.depth >= 1) {
      const base = d3.color(groupColor(parent.data.name))
      if (base) { base.opacity = 0.7; return base.formatRgb() }
    }
    return theme.surface
  }

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const tooltip = createTooltip(container)

  // Filter out root node (depth 0)
  const cells = root.descendants().filter(d => d.depth > 0)

  const cell = svg.selectAll('.flame-cell')
    .data(cells)
    .join('g')
    .attr('class', 'flame-cell')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)

  // Rectangles
  cell.append('rect')
    .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
    .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
    .attr('fill', (d: any) => cellColor(d))
    .attr('stroke', theme.border)
    .attr('stroke-width', 0.5)
    .attr('rx', 2)
    .style('cursor', 'pointer')
    .on('mouseover', function (event: any, d: any) {
      d3.select(this).attr('stroke', theme.text).attr('stroke-width', 1.5)
      config?.onNodeHover?.(d)
      const parentName = d.depth === 1 ? '' : d.parent?.data.name || ''
      let html = `<strong>${d.data.name}</strong>`
      if (parentName && parentName !== d.data.name) html += `<br>Group: ${parentName}`
      html += `<br>Value: ${formatNumber(d.value || 0, { decimals: 4 })}`
      const meta = d.data.metadata || {}
      for (const [k, v] of Object.entries(meta)) {
        html += `<br>${k}: ${v}`
      }
      showTooltip(tooltip, event, html)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseout', function () {
      d3.select(this).attr('stroke', theme.border).attr('stroke-width', 0.5)
      config?.onNodeHover?.(null)
      hideTooltip(tooltip)
    })
    .on('click', (_, d: any) => config?.onNodeClick?.(d))

  // Labels — only if cell is wide enough
  cell.append('text')
    .attr('x', 4)
    .attr('y', (d: any) => Math.min(14, (d.y1 - d.y0) / 2 + 4))
    .attr('font-size', '10px')
    .attr('fill', theme.text)
    .attr('pointer-events', 'none')
    .text((d: any) => {
      const cellWidth = d.x1 - d.x0
      return truncateLabel(d.data.name, cellWidth, 7)
    })

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
