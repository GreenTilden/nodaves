<script setup lang="ts">
/**
 * darn3 — Generic Vue 3 Wrapper Component
 *
 * Handles the D3 lifecycle (mount → render → watch → cleanup)
 * and provides loading/error/empty states with ResizeObserver.
 *
 * @example
 * ```vue
 * <Darn3Wrapper :loading="loading" :error="error" :empty="!data" :height="320" @resize="rerender">
 *   <div ref="target" style="width:100%;height:100%" />
 * </Darn3Wrapper>
 * ```
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  /** Show loading spinner/message */
  loading?: boolean
  /** Error message to display (null = no error) */
  error?: string | null
  /** True if data is empty/null */
  empty?: boolean
  /** Message when data is empty */
  emptyMessage?: string
  /** Container height in pixels */
  height?: number
  /** Optional title above the chart */
  title?: string
  /** Optional subtitle below the title */
  subtitle?: string
}>(), {
  loading: false,
  error: null,
  empty: false,
  emptyMessage: 'No data available',
  height: 320,
  title: '',
  subtitle: '',
})

const emit = defineEmits<{
  resize: [width: number, height: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null
let resizeTimer: number | null = null

onMounted(() => {
  if (!containerRef.value) return
  resizeObserver = new ResizeObserver(() => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      if (containerRef.value) {
        emit('resize', containerRef.value.clientWidth, containerRef.value.clientHeight)
      }
    }, 200)
  })
  resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="darn3-wrapper">
    <div v-if="title" class="darn3-title">
      {{ title }}
      <span v-if="subtitle" class="darn3-subtitle">{{ subtitle }}</span>
    </div>
    <div ref="containerRef" class="darn3-container" :style="{ height: `${height}px` }">
      <div v-if="loading" class="darn3-state">Loading...</div>
      <div v-else-if="error" class="darn3-state darn3-error">{{ error }}</div>
      <div v-else-if="empty" class="darn3-state">{{ emptyMessage }}</div>
      <slot v-else />
    </div>
  </div>
</template>

<style scoped>
.darn3-wrapper { width: 100%; }
.darn3-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
  margin-bottom: 0.5rem;
}
.darn3-subtitle {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--text-secondary, #a0a0a0);
  margin-left: 0.5rem;
}
.darn3-container {
  position: relative;
  background: var(--bg-secondary, #16213e);
  border: 1px solid var(--border-color, #2a2a4a);
  border-radius: 8px;
  padding: 0.75rem;
  overflow: hidden;
}
.darn3-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #a0a0a0);
  font-size: 0.85rem;
}
.darn3-error { color: var(--accent-red, #ef476f); }
</style>
