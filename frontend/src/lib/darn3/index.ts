/**
 * # darn3 — DArnTech D3 Visualization Library
 *
 * Universal, theme-aware D3 chart renderers for Vue 3 applications.
 * 13 chart types with full TypeScript support and JSDoc documentation.
 *
 * ## Quick Start
 * ```ts
 * import { renderHeatmap, renderGauge, getTheme, PALETTE } from '@/lib/darn3'
 * ```
 *
 * ## Chart Catalog
 * | Renderer | Type | Best For |
 * |----------|------|----------|
 * | renderHeatmap | Grid | Cross-dimensional comparison |
 * | renderStreamgraph | Area | Volume over time |
 * | renderSunburst | Radial | Hierarchical drill-down |
 * | renderTreemap | Tiles | Size comparison with drill-down |
 * | renderFlame | Bars | Feature importance stacking |
 * | renderChordDiagram | Circular | Relationship strength |
 * | renderSankey | Flow | Multi-stage flow |
 * | renderForceGraph | Network | Relationship exploration |
 * | renderParallelCoords | Multi-axis | Multi-dimensional comparison |
 * | renderPipelineFlow | Flow | Pipeline/process stages |
 * | renderGantt | Timeline | Scheduled items with duration |
 * | renderTimeline | Timeline | Event markers on time axis |
 * | renderGauge | Radial | Single value progress |
 *
 * @module darn3
 */

// ─── Core ───────────────────────────────────────────────
export { getTheme, PALETTE, paletteColor, hashColor } from './core/theme'
export type { D3Theme } from './core/theme'

export { createTooltip, showTooltip, hideTooltip, moveTooltip } from './core/tooltip'

export { truncateLabel, formatNumber, formatDate, luminance, contrastText, parseDate } from './core/utils'

export { DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_MARGIN, PHASE_COLORS, STATUS_COLORS, GAUGE_THRESHOLDS, ANIM } from './core/constants'

// ─── Types ──────────────────────────────────────────────
export type {
  D3RenderResult, BaseConfig,
  GridCell, HeatmapConfig,
  TimeSeriesStack, StreamConfig,
  HierarchyNode, HierarchyConfig,
  FlowNode, FlowLink, FlowData, SankeyConfig,
  ChordData, ChordConfig,
  NetworkNode, NetworkLink, ForceConfig,
  ParallelDatum, ParallelConfig,
  GanttItem, GanttConfig,
  TimelineEvent, TimelineConfig,
  GaugeConfig,
  PipelineFlowData, PipelineFlowConfig,
} from './core/types'

// ─── Renderers ──────────────────────────────────────────
export { renderHeatmap } from './renderers/heatmap'
export { renderStreamgraph } from './renderers/streamgraph'
export { renderSunburst } from './renderers/sunburst'
export { renderTreemap } from './renderers/treemap'
export { renderFlame } from './renderers/flame'
export { renderChordDiagram } from './renderers/chord'
export { renderSankey } from './renderers/sankey'
export { renderForceGraph } from './renderers/forceGraph'
export { renderParallelCoords } from './renderers/parallelCoords'
export { renderPipelineFlow } from './renderers/pipelineFlow'
export { renderGantt } from './renderers/gantt'
export { renderTimeline } from './renderers/timeline'
export { renderGauge } from './renderers/gauge'

// ─── Vue Integration ────────────────────────────────────
export { useDarn3 } from './vue/composable'
