/**
 * darn3 — Force-Directed Graph Renderer
 *
 * Interactive node-link network visualization using D3 force simulation.
 * Nodes are colored by group, sized by optional size property, and
 * support drag, zoom, pan, and hover interactions.
 *
 * @module darn3/renderers/forceGraph
 * @category Renderer
 */

import * as d3 from 'd3'
import { getTheme, PALETTE } from '../core/theme'
import { createTooltip, showTooltip, hideTooltip, moveTooltip } from '../core/tooltip'
import type { NetworkNode, NetworkLink, ForceConfig, D3RenderResult } from '../core/types'

/** Internal simulation node extending NetworkNode with D3 position fields */
interface SimNode extends NetworkNode, d3.SimulationNodeDatum {}

/** Internal simulation link with typed source/target and value */
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  value: number
  label?: string
}

/**
 * Render a force-directed graph into a container element.
 *
 * Creates an interactive network visualization with:
 * - Nodes colored by group using the darn3 categorical palette
 * - Link thickness proportional to value
 * - Drag to reposition nodes
 * - Scroll to zoom, drag background to pan
 * - Hover tooltips showing node details
 *
 * @param container - DOM element to render into (will be cleared)
 * @param data - Network data with nodes and links
 * @param config - Optional layout and interaction configuration
 * @returns Render result with cleanup function and SVG selection
 *
 * @example
 * ```ts
 * import { renderForceGraph } from '@/lib/darn3/renderers/forceGraph'
 *
 * const result = renderForceGraph(el, {
 *   nodes: [
 *     { id: 'a', label: 'Node A', group: 'inputs', size: 12 },
 *     { id: 'b', label: 'Node B', group: 'outputs', size: 8 },
 *   ],
 *   links: [
 *     { source: 'a', target: 'b', value: 5 },
 *   ],
 * }, { charge: -300 })
 *
 * // Later: result.cleanup()
 * ```
 */
export function renderForceGraph(
  container: HTMLElement,
  data: { nodes: NetworkNode[]; links: NetworkLink[] },
  config?: ForceConfig
): D3RenderResult {
  container.innerHTML = ''

  if (!data?.nodes?.length) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No graph data</p>'
    return { cleanup: () => {} }
  }

  const theme = getTheme(container)
  const width = config?.width || container.clientWidth || 600
  const height = config?.height || 400
  const chargeStrength = config?.charge ?? -200

  const groups = [...new Set(data.nodes.map(n => n.group))]
  const color = d3.scaleOrdinal<string>().domain(groups).range(PALETTE)

  const maxVal = d3.max(data.links, l => l.value) || 1
  const linkWidth = d3.scaleLinear().domain([0, maxVal]).range([1, 3])
  const linkOpacity = d3.scaleLinear().domain([0, maxVal]).range([0.2, 0.8])

  const nodes: SimNode[] = data.nodes.map(n => ({ ...n }))
  const links: SimLink[] = data.links.map(l => ({
    source: l.source,
    target: l.target,
    value: l.value,
    label: l.label,
  }))

  const simulation = d3.forceSimulation<SimNode>(nodes)
    .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(chargeStrength))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide<SimNode>().radius(d => (d.size || 8) + 4))

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'system-ui, sans-serif')

  const tooltip = createTooltip(container)

  // Zoom + pan
  const g = svg.append('g')
  svg.call(
    d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => g.attr('transform', event.transform)) as any
  )

  // Links
  const linkSel = g.selectAll('.link')
    .data(links)
    .join('line')
    .attr('class', 'link')
    .attr('stroke', theme.border)
    .attr('stroke-opacity', d => linkOpacity(d.value))
    .attr('stroke-width', d => linkWidth(d.value))

  // Nodes
  const nodeSel = g.selectAll('.node')
    .data(nodes)
    .join('circle')
    .attr('class', 'node')
    .attr('r', d => d.size || 8)
    .attr('fill', d => color(d.group))
    .attr('stroke', theme.surface)
    .attr('stroke-width', 1.5)
    .on('mouseover', function (event: any, d) {
      d3.select(this).attr('stroke', theme.text).attr('stroke-width', 2.5)
      config?.onNodeHover?.(d)
      showTooltip(tooltip, event,
        `<strong>${d.label}</strong><br>Group: ${d.group}<br>Size: ${d.size || 8}`)
    })
    .on('mousemove', (event: any) => moveTooltip(tooltip, event))
    .on('mouseout', function () {
      d3.select(this).attr('stroke', theme.surface).attr('stroke-width', 1.5)
      config?.onNodeHover?.(null)
      hideTooltip(tooltip)
    })
    .on('click', (_, d) => config?.onNodeClick?.(d))

  // Drag behavior
  nodeSel.call(
    d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      }) as any
  )

  // Tick
  simulation.on('tick', () => {
    linkSel
      .attr('x1', d => (d.source as SimNode).x!)
      .attr('y1', d => (d.source as SimNode).y!)
      .attr('x2', d => (d.target as SimNode).x!)
      .attr('y2', d => (d.target as SimNode).y!)

    nodeSel
      .attr('cx', d => d.x!)
      .attr('cy', d => d.y!)
  })

  return {
    cleanup: () => {
      simulation.stop()
      tooltip.remove()
      svg.remove()
    },
    svg,
  }
}
