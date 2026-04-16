/**
 * darn3 — Shared Tooltip Utility
 *
 * Provides styled, theme-aware tooltips that follow the mouse cursor.
 * Attach to any D3 visualization with consistent look and feel.
 *
 * @module darn3/core/tooltip
 *
 * @example
 * ```ts
 * import { createTooltip, showTooltip, hideTooltip } from '@/lib/darn3'
 *
 * const tooltip = createTooltip(container)
 * d3.selectAll('rect')
 *   .on('mouseover', (e) => showTooltip(tooltip, e, '<b>Hello</b>'))
 *   .on('mouseout', () => hideTooltip(tooltip))
 *
 * // Cleanup: tooltip.remove()
 * ```
 */

import * as d3 from 'd3'

type TooltipSelection = d3.Selection<HTMLDivElement, unknown, null, undefined>

/**
 * Create a styled tooltip div attached to a container element.
 *
 * The tooltip is absolutely positioned within the container (which gets
 * `position: relative` if it doesn't already have positioning). It starts
 * hidden (opacity: 0) and becomes visible via showTooltip().
 *
 * @param container - Parent element for the tooltip
 * @returns D3 selection of the tooltip div (call .remove() in cleanup)
 */
export function createTooltip(container: HTMLElement): TooltipSelection {
  const pos = getComputedStyle(container).position
  if (pos === 'static' || !pos) container.style.position = 'relative'

  return d3.select(container)
    .append('div')
    .attr('class', 'darn3-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('opacity', '0')
    .style('background', 'var(--bg-card, #0f3460)')
    .style('border', '1px solid var(--border-color, #2a2a4a)')
    .style('border-radius', '6px')
    .style('padding', '8px 12px')
    .style('font-size', '12px')
    .style('color', 'var(--text-primary, #e0e0e0)')
    .style('z-index', '1000')
    .style('max-width', '280px')
    .style('white-space', 'pre-line')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.4)')
    .style('transition', 'opacity 0.15s') as any
}

/**
 * Show the tooltip near the mouse event with HTML content.
 *
 * @param tooltip - Tooltip selection from createTooltip()
 * @param event - Mouse event for positioning
 * @param html - HTML string to display
 */
export function showTooltip(tooltip: TooltipSelection, event: MouseEvent, html: string): void {
  tooltip.html(html)
    .style('opacity', '1')
    .style('left', `${event.offsetX + 12}px`)
    .style('top', `${event.offsetY - 12}px`)
}

/**
 * Hide the tooltip (fade out).
 * @param tooltip - Tooltip selection from createTooltip()
 */
export function hideTooltip(tooltip: TooltipSelection): void {
  tooltip.style('opacity', '0')
}

/**
 * Move the tooltip to follow the mouse.
 * @param tooltip - Tooltip selection from createTooltip()
 * @param event - Mouse event for positioning
 */
export function moveTooltip(tooltip: TooltipSelection, event: MouseEvent): void {
  tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 12}px`)
}
