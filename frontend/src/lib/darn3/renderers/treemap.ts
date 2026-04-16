/**
 * darn3 — Treemap Renderer
 *
 * Zoomable treemap for exploring hierarchical data sized by value.
 * Click a group header to drill down, click "Back" to zoom out.
 * Useful for weight breakdowns, file sizes, budget allocations,
 * or any nested dataset where leaf size encodes importance.
 *
 * @module darn3/renderers/treemap
 * @category Renderer
 *
 * @example
 * ```ts
 * import { renderTreemap } from '@/lib/darn3/renderers/treemap'
 *
 * const data: HierarchyNode = {
 *   name: 'Root',
 *   children: [
 *     { name: 'Group A', children: [
 *       { name: 'Item 1', value: 30 },
 *       { name: 'Item 2', value: 20 },
 *     ]},
 *     { name: 'Group B', children: [
 *       { name: 'Item 3', value: 50 },
 *     ]},
 *   ],
 * }
 *
 * const { cleanup } = renderTreemap(container, data)
 * ```
 */

import * as d3 from 'd3'
import { getTheme, PALETTE } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import { truncateLabel, formatNumber, contrastText } from '../core/utils'
import type { HierarchyNode, HierarchyConfig, D3RenderResult } from '../core/types'

/**
 * Render a zoomable treemap visualization.
 *
 * Lays out a {@link HierarchyNode} tree as nested rectangles sized
 * proportionally to each node's value. Top-level children are colored
 * from the darn3 palette. Supports drill-down by clicking group headers.
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Root node of the hierarchy tree
 * @param config - Optional layout, color, and interaction configuration
 * @returns {@link D3RenderResult} with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * renderTreemap(el, root, {
 *   width: 800,
 *   height: 500,
 *   onNodeClick: (node) => console.log(node.data.name),
 * })
 * ```
 */
export function renderTreemap(
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
  const width = config?.width || container.clientWidth || 600
  const height = config?.height || container.clientHeight || 400

  type RectNode = d3.HierarchyRectangularNode<HierarchyNode>

  const hierarchy = d3.hierarchy(data)
    .sum((d: any) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))

  const treemap = d3.treemap<HierarchyNode>()
    .size([width, height])
    .paddingInner(2)
    .paddingOuter(4)
    .paddingTop(22)
    .round(true)

  const root = treemap(hierarchy) as RectNode

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  // Color scale by top-level children
  const topNames = (root.children || []).map(d => d.data.name)
  const color = d3.scaleOrdinal<string>().domain(topNames).range(PALETTE)

  const tooltip = createTooltip(container)
  let currentRoot: RectNode = root
  void currentRoot

  /**
   * Walk up to the depth-1 ancestor for consistent coloring.
   * @param d - Any node in the tree
   * @returns Name of the top-level ancestor
   */
  function topAncestor(d: RectNode): string {
    let node = d
    while (node.parent && node.parent !== root) node = node.parent as any
    return node.data.name
  }

  /**
   * Render (or re-render after zoom) the treemap at a given focus node.
   * @param focus - The node to treat as the visible root
   */
  function render(focus: RectNode) {
    svg.selectAll('*').remove()

    // Back button when zoomed in
    if (focus !== root) {
      svg.append('text')
        .attr('x', 8)
        .attr('y', 14)
        .text('\u2190 Back')
        .attr('fill', theme.primary)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .style('cursor', 'pointer')
        .on('click', () => {
          treemap(root)
          currentRoot = root
          render(root)
        })
    }

    // Group headers for direct children of focus
    if (focus.children) {
      svg.selectAll('.group-header')
        .data(focus.children)
        .join('text')
        .attr('class', 'group-header')
        .attr('x', (d: any) => d.x0 + 4)
        .attr('y', (d: any) => d.y0 + 15)
        .text((d: any) => d.data.name)
        .attr('fill', theme.text)
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')
    }

    // Leaf rectangles
    const leaves = focus.leaves()
    const cell = svg.selectAll('.leaf')
      .data(leaves)
      .join('g')
      .attr('class', 'leaf')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)

    cell.append('rect')
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('fill', (d: any) => config?.getColor ? config.getColor(d) : color(topAncestor(d)))
      .attr('fill-opacity', 0.7)
      .attr('stroke', theme.border)
      .attr('stroke-width', 0.5)
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function (this: SVGRectElement, event: any, d: any) {
        d3.select(this).attr('fill-opacity', 1)
        const meta = d.data.metadata || {}
        let html = `<strong>${d.data.name}</strong>`
        html += `<br>Value: ${formatNumber(d.value || 0, { decimals: 3 })}`
        for (const [k, v] of Object.entries(meta)) {
          html += `<br>${k}: ${v}`
        }
        showTooltip(tooltip, event, html)
        config?.onNodeHover?.(d)
      })
      .on('mousemove', (event: any) => moveTooltip(tooltip, event))
      .on('mouseout', function (this: SVGRectElement) {
        d3.select(this).attr('fill-opacity', 0.7)
        hideTooltip(tooltip)
        config?.onNodeHover?.(null)
      })
      .on('click', (_event: any, d: any) => config?.onNodeClick?.(d))

    // Leaf labels — truncated to fit available width
    cell.append('text')
      .attr('x', 3)
      .attr('y', 14)
      .text((d: any) => {
        const w = d.x1 - d.x0
        return truncateLabel(d.data.name, w)
      })
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .style('pointer-events', 'none')

    // Clickable group header zones for drill-down
    if (focus.children) {
      for (const child of focus.children) {
        if (child.children) {
          svg.append('rect')
            .attr('x', (child as any).x0)
            .attr('y', (child as any).y0)
            .attr('width', (child as any).x1 - (child as any).x0)
            .attr('height', 20)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', () => {
              treemap(child as any)
              currentRoot = child as any
              render(child as any)
            })
        }
      }
    }
  }

  render(root)

  return {
    cleanup: () => { tooltip.remove(); svg.remove() },
    svg,
  }
}
