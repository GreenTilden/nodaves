/**
 * darn3 — Vue 3 Lifecycle Composable
 *
 * Manages the D3 render → watch → cleanup lifecycle inside a Vue component.
 * Eliminates boilerplate: just provide the renderer function and data ref.
 *
 * @module darn3/vue/composable
 *
 * @example
 * ```ts
 * import { useDarn3 } from '@/lib/darn3'
 * import { renderHeatmap } from '@/lib/darn3'
 *
 * const { targetRef, error } = useDarn3(
 *   () => data.value,
 *   (container, d) => renderHeatmap(container, d, { domain: [30, 80] })
 * )
 * ```
 */

import { ref, watch, onMounted, onBeforeUnmount, type Ref } from 'vue'
import type { D3RenderResult } from '../core/types'

/**
 * Composable that binds a D3 renderer to a Vue component lifecycle.
 *
 * @param getData - Reactive getter for chart data (return null/undefined to skip render)
 * @param render - Function that calls a darn3 renderer and returns D3RenderResult
 * @returns Object with targetRef (bind to template div) and error ref
 */
export function useDarn3<T>(
  getData: () => T | null | undefined,
  render: (container: HTMLElement, data: T) => D3RenderResult,
) {
  const targetRef = ref<HTMLElement | null>(null) as Ref<HTMLElement | null>
  const error = ref<string | null>(null)
  let cleanup: (() => void) | null = null

  function doRender() {
    if (cleanup) { cleanup(); cleanup = null }
    error.value = null

    const data = getData()
    if (!targetRef.value || !data) return

    try {
      const result = render(targetRef.value, data)
      cleanup = result.cleanup
    } catch (e: any) {
      error.value = e?.message || 'Render error'
      console.error('[darn3] Render failed:', e)
    }
  }

  onMounted(doRender)

  watch(getData, doRender, { deep: true })

  onBeforeUnmount(() => {
    if (cleanup) { cleanup(); cleanup = null }
  })

  /** Call this from a ResizeObserver or @resize event to re-render */
  function onResize() {
    doRender()
  }

  return { targetRef, error, onResize, rerender: doRender }
}
