/**
 * darn3 — Sunburst Renderer
 *
 * Zoomable radial partition chart for hierarchical drill-down.
 * Click any arc to zoom in; click the center circle to zoom out.
 * Useful for weight breakdowns, category hierarchies, file trees,
 * or any nested data where proportion matters.
 *
 * @module darn3/renderers/sunburst
 * @category Renderer
 *
 * @example
 * ```ts
 * import { renderSunburst } from '@/lib/darn3/renderers/sunburst'
 *
 * const data: HierarchyNode = {
 *   name: 'All',
 *   children: [
 *     { name: 'Category A', children: [
 *       { name: 'Sub 1', value: 40 },
 *       { name: 'Sub 2', value: 25 },
 *     ]},
 *     { name: 'Category B', value: 35 },
 *   ],
 * }
 *
 * const { cleanup } = renderSunburst(container, data, {
 *   width: 500,
 *   height: 500,
 * })
 * ```
 */

import * as d3 from 'd3'
import { getTheme, PALETTE } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import { formatNumber } from '../core/utils'
import type { HierarchyNode, HierarchyConfig, D3RenderResult } from '../core/types'

/**
 * Render a zoomable sunburst (radial partition) visualization.
 *
 * Lays out a {@link HierarchyNode} tree as concentric arcs where angle
 * encodes proportion of the parent. Top-level children are colored from
 * the darn3 palette; deeper nodes inherit their ancestor's color with
 * decreasing opacity.
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Root node of the hierarchy tree
 * @param config - Optional layout, color, and interaction configuration
 * @returns {@link D3RenderResult} with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * renderSunburst(el, root, {
 *   getColor: (node) => node.depth === 1 ? '#ff0000' : '#00ff00',
 *   onNodeClick: (node) => console.log('Clicked:', node.data.name),
 * })
 * ```
 */
export function renderSunburst(
  container: HTMLElement,
  data: HierarchyNode,
  config?: HierarchyConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data || !data.children?.length) {
    container.innerHTML =
      '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No hierarchy data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config?.width || container.clientWidth || 500
  const height = config?.height || container.clientHeight || 500
  const radius = Math.min(width, height) / 2

  type RectNode = d3.HierarchyRectangularNode<HierarchyNode>

  const hierarchy = d3.hierarchy(data)
    .sum((d: any) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))

  const root = d3.partition<HierarchyNode>()
    .size([2 * Math.PI, radius])(hierarchy) as RectNode

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)

  // Arc generator from partition coordinates
  const arc = d3.arc<RectNode>()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius / 2)
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y1 - 1)

  // Color: depth 1 from PALETTE, depth 2+ inherits parent with lower opacity
  const topNames = (root.children || []).map(d => d.data.name)
  const colorScale = d3.scaleOrdinal<string>().domain(topNames).range(PALETTE)

  /**
   * Determine fill color for a node.
   * @param d - Partition node
   * @returns CSS color string
   */
  function nodeColor(d: RectNode): string {
    if (config?.getColor) return config.getColor(d)
    if (d.depth === 0) return 'none'
    // Walk up to depth-1 ancestor for consistent coloring
    let ancestor = d
    while (ancestor.depth > 1 && ancestor.parent) ancestor = ancestor.parent as any
    return colorScale(ancestor.data.name)
  }

  /**
   * Determine fill opacity based on depth.
   * @param d - Partition node
   * @returns Opacity value 0-1
   */
  function nodeOpacity(d: RectNode): number {
    if (d.depth <= 1) return 0.9
    return Math.max(0.4, 0.9 - (d.depth - 1) * 0.15)
  }

  const tooltip = createTooltip(container)
  let currentFocus: RectNode = root

  // Breadcrumb trail at top
  const breadcrumb = svg.append('text')
    .attr('x', 10)
    .attr('y', 18)
    .attr('fill', theme.textSecondary)
    .attr('font-size', '12px')

  /**
   * Update the breadcrumb trail text to show ancestry path.
   * @param node - Currently focused node
   */
  function updateBreadcrumb(node: RectNode) {
    const ancestors = node.ancestors().reverse()
    breadcrumb.selectAll('tspan').remove()
    ancestors.forEach((a, i) => {
      if (i > 0) {
        breadcrumb.append('tspan')
          .text(' \u2192 ')
          .attr('fill', theme.textSecondary)
      }
      breadcrumb.append('tspan')
        .text(a.data.name)
        .attr('fill', i === ancestors.length - 1 ? theme.primary : theme.text)
    })
  }

  // Render arcs (skip root — depth 0)
  const visibleNodes = root.descendants().filter(d => d.depth > 0) as RectNode[]
  const paths = g.selectAll<SVGPathElement, RectNode>('path')
    .data(visibleNodes)
    .join('path')
    .attr('d', arc as any)
    .attr('fill', (d: any) => nodeColor(d))
    .attr('fill-opacity', (d: any) => nodeOpacity(d))
    .attr('stroke', theme.background)
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')

  // Hover — tooltip with name, value, % of parent
  paths
    .on('mouseover', function (event: any, d: any) {
      d3.select(this).attr('fill-opacity', 1)
      const parentVal = d.parent?.value || d.value || 1
      const pct = ((d.value || 0) / parentVal * 100).toFixed(1)
      let html = `<strong>${d.data.name}</strong>`
      html += `<br>Value: ${formatNumber(d.value || 0, { decimals: 3 })}`
      html += `<br>${pct}% of parent`
      const meta = d.data.metadata || {}
      for (const [k, v] of Object.entries(meta)) {
        html += `<br>${k}: ${v}`
      }
      showTooltip(tooltip, event, html)
      config?.onNodeHover?.(d)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseleave', function (_event: any, d: any) {
      d3.select(this).attr('fill-opacity', nodeOpacity(d))
      hideTooltip(tooltip)
      config?.onNodeHover?.(null)
    })

  // Click arc -> zoom into that node
  paths.on('click', function (event: any, d: any) {
    event.stopPropagation()
    zoomTo(d)
    config?.onNodeClick?.(d)
  })

  // Center circle — click to zoom out
  g.append('circle')
    .attr('r', (root as any).y1 ? (root as any).y0 : radius * 0.15)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .style('cursor', 'pointer')
    .on('click', () => {
      if (currentFocus.parent) zoomTo(currentFocus.parent)
    })

  // Center label
  const centerLabel = g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', theme.text)
    .attr('font-size', '13px')
    .attr('font-weight', 'bold')
    .text(data.name)

  updateBreadcrumb(root)

  /**
   * Animate the sunburst to zoom into a target node.
   * @param target - Node to zoom into
   */
  function zoomTo(target: RectNode) {
    currentFocus = target
    const targetAngle = target.x1 - target.x0
    const targetDepth = target.y0

    const t = svg.transition().duration(650)

    paths.transition(t as any)
      .attrTween('d', (d: any) => {
        const ix0 = d3.interpolate(d._cx0 ?? d.x0, adjustAngle(d.x0, target.x0, targetAngle))
        const ix1 = d3.interpolate(d._cx1 ?? d.x1, adjustAngle(d.x1, target.x0, targetAngle))
        const iy0 = d3.interpolate(d._cy0 ?? d.y0, Math.max(0, d.y0 - targetDepth))
        const iy1 = d3.interpolate(d._cy1 ?? d.y1, Math.max(0, d.y1 - targetDepth))
        return (t: number) => {
          d._cx0 = ix0(t); d._cx1 = ix1(t)
          d._cy0 = iy0(t); d._cy1 = iy1(t)
          return arc({ x0: d._cx0, x1: d._cx1, y0: d._cy0, y1: d._cy1 } as any) || ''
        }
      })
      .attr('fill-opacity', (d: any) => {
        if (!isDescendant(d, target) && d !== target) return 0
        return nodeOpacity(d)
      })

    centerLabel.text(target.data.name)
    updateBreadcrumb(target)
  }

  /**
   * Remap an angle relative to a new parent span filling the full circle.
   * @param angle - Original angle in radians
   * @param parentStart - Parent start angle
   * @param parentSpan - Parent angular span
   * @returns Adjusted angle
   */
  function adjustAngle(angle: number, parentStart: number, parentSpan: number): number {
    if (parentSpan === 0) return 0
    return ((angle - parentStart) / parentSpan) * 2 * Math.PI
  }

  /**
   * Check if a node is a descendant of a given ancestor.
   * @param node - Node to check
   * @param ancestor - Potential ancestor
   * @returns True if node descends from ancestor
   */
  function isDescendant(node: RectNode, ancestor: RectNode): boolean {
    let current: RectNode | null = node
    while (current) {
      if (current === ancestor) return true
      current = current.parent
    }
    return false
  }

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
