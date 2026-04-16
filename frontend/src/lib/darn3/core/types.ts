/**
 * darn3 — Universal D3 Visualization Types
 *
 * Generic data interfaces for all darn3 renderers. These types are
 * domain-agnostic — they describe visual structures (grids, hierarchies,
 * flows, networks) not business concepts. Consumers map their domain
 * data into these shapes before passing to renderers.
 *
 * @module darn3/core/types
 */

// ─── Common ─────────────────────────────────────────────

/** Every renderer returns at least a cleanup function */
export interface D3RenderResult {
  /** Call to remove SVG, tooltips, and event listeners */
  cleanup: () => void
  /** The root SVG selection (for advanced manipulation) */
  svg?: any
}

/** Base config shared by all renderers */
export interface BaseConfig {
  /** Chart width in pixels (defaults to container.clientWidth) */
  width?: number
  /** Chart height in pixels (defaults to container.clientHeight) */
  height?: number
}

// ─── Grid / Heatmap ─────────────────────────────────────

/** A single cell in a grid/heatmap visualization */
export interface GridCell {
  row: string
  col: string
  value: number
  metadata?: Record<string, any>
}

export interface HeatmapConfig extends BaseConfig {
  /** d3 color interpolator (default: interpolateRdYlGn) */
  colorInterpolator?: (t: number) => string
  /** Value domain [min, max] for the color scale */
  domain?: [number, number]
  onCellClick?: (cell: GridCell) => void
}

// ─── Time Series / Streamgraph ──────────────────────────

/** Stacked time series data */
export interface TimeSeriesStack {
  /** X-axis labels (dates, phases, categories) */
  labels: string[]
  /** One series per layer in the stack */
  series: Array<{
    label: string
    values: number[]
    color?: string
  }>
}

export interface StreamConfig extends BaseConfig {
  onLayerClick?: (label: string) => void
  onLayerHover?: (label: string | null) => void
  /** Animate from flat to wiggle on first render (default: false) */
  animate?: boolean
}

// ─── Hierarchy (Sunburst, Treemap, Flame) ───────────────

/** Recursive tree node for hierarchical visualizations */
export interface HierarchyNode {
  name: string
  value?: number
  children?: HierarchyNode[]
  metadata?: Record<string, any>
}

export interface HierarchyConfig extends BaseConfig {
  onNodeClick?: (node: any) => void
  onNodeHover?: (node: any) => void
  /** Custom color function (overrides palette) */
  getColor?: (node: any) => string
}

// ─── Flow / Sankey ──────────────────────────────────────

export interface FlowNode {
  name: string
  category: string
}

export interface FlowLink {
  source: string
  target: string
  value: number
}

export interface FlowData {
  nodes: FlowNode[]
  links: FlowLink[]
}

export interface SankeyConfig extends BaseConfig {
  nodeWidth?: number
  nodePadding?: number
  onNodeClick?: (node: any) => void
  onNodeHover?: (node: any) => void
}

// ─── Chord ──────────────────────────────────────────────

/** Square matrix with labels for chord diagrams */
export interface ChordData {
  labels: string[]
  /** Adjacency matrix (symmetric for undirected relationships) */
  matrix: number[][]
  /** Optional details per relationship, keyed "i-j" */
  details?: Record<string, string[]>
}

export interface ChordConfig extends BaseConfig {
  onArcClick?: (label: string, index: number) => void
  onArcHover?: (label: string | null) => void
  onChordClick?: (source: string, target: string, details: string[]) => void
}

// ─── Network / Force Graph ──────────────────────────────

export interface NetworkNode {
  id: string
  label: string
  group: string
  size?: number
}

export interface NetworkLink {
  source: string
  target: string
  value: number
  label?: string
}

export interface ForceConfig extends BaseConfig {
  /** Charge strength (default: -200, more negative = more spread) */
  charge?: number
  onNodeClick?: (node: NetworkNode) => void
  onNodeHover?: (node: NetworkNode | null) => void
}

// ─── Parallel Coordinates ───────────────────────────────

/** One data point with named dimensions */
export interface ParallelDatum {
  id: string
  /** Score or metric for coloring the line */
  score: number
  /** Dimension values — keys must match axes config */
  [dimension: string]: string | number
}

export interface ParallelConfig extends BaseConfig {
  /** Which dimensions to show as axes (ordered left to right) */
  axes: string[]
  /** Dimension key to use for line coloring (default: 'score') */
  colorBy?: string
  onLineClick?: (datum: ParallelDatum) => void
  onBrushChange?: (selected: ParallelDatum[]) => void
}

// ─── Gantt ──────────────────────────────────────────────

/** A single bar in a Gantt chart */
export interface GanttItem {
  id: string
  label: string
  /** Category for grouping/coloring */
  group: string
  /** Start date (ISO string or epoch) */
  start: string | number
  /** End date (ISO string or epoch) */
  end: string | number
  /** 0-100 completion percentage */
  progress?: number
  metadata?: Record<string, any>
}

export interface GanttConfig extends BaseConfig {
  /** Show today marker line (default: true) */
  showToday?: boolean
  onBarClick?: (item: GanttItem) => void
}

// ─── Timeline ───────────────────────────────────────────

/** An event on a timeline */
export interface TimelineEvent {
  id: string
  label: string
  date: string
  /** Visual shape: diamond (milestone), square (gate), circle (event) */
  shape: 'diamond' | 'square' | 'circle'
  /** Category for coloring */
  category: string
  /** Optional status for styling */
  status?: string
  metadata?: Record<string, any>
}

export interface TimelineConfig extends BaseConfig {
  /** Show today marker (default: true) */
  showToday?: boolean
  onEventClick?: (event: TimelineEvent) => void
  onEventHover?: (event: TimelineEvent | null) => void
}

// ─── Gauge ──────────────────────────────────────────────

export interface GaugeConfig extends BaseConfig {
  /** Label shown below the gauge */
  label?: string
  /** Unit string (e.g., "$", "%", "hrs") */
  unit?: string
  /** Maximum value (default: 100) */
  max?: number
  /** Color thresholds: [red, yellow, green] as percentages */
  thresholds?: [number, number]
  /** Animate fill on mount (default: true) */
  animate?: boolean
}

// ─── Pipeline Flow ──────────────────────────────────────

/** Reuses FlowData + SankeyConfig — included for clarity */
export type PipelineFlowData = FlowData
export type PipelineFlowConfig = SankeyConfig
