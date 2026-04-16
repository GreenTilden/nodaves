# darn3 — DArnTech D3 Visualization Library

Internal D3.js visualization library for DArnTech projects. 13 chart types, theme-aware, Vue 3 integrated.

## Installation

Already included in darntech. For other projects:
```bash
npm install d3@^7.9.0 d3-sankey@^0.12.3
# Then copy src/lib/darn3/ or npm link
```

## Quick Start

```ts
import { renderGauge, renderTimeline, useDarn3, PALETTE } from '@/lib/darn3'

// Option A: Direct render
const { cleanup } = renderGauge(container, 72, { label: 'Progress', max: 100 })

// Option B: Vue composable
const { targetRef, error } = useDarn3(
  () => myData.value,
  (el, data) => renderTimeline(el, data, { showToday: true })
)
```

## Chart Catalog

### Grid
- **Heatmap** — `renderHeatmap(el, GridCell[], HeatmapConfig?)` — Row × column colored grid

### Time Series
- **Streamgraph** — `renderStreamgraph(el, TimeSeriesStack, StreamConfig?)` — Stacked wiggle area
- **Gantt** — `renderGantt(el, GanttItem[], GanttConfig?)` — Horizontal duration bars
- **Timeline** — `renderTimeline(el, TimelineEvent[], TimelineConfig?)` — Event markers on axis

### Hierarchical
- **Sunburst** — `renderSunburst(el, HierarchyNode, HierarchyConfig?)` — Zoomable radial partition
- **Treemap** — `renderTreemap(el, HierarchyNode, HierarchyConfig?)` — Zoomable rectangular tiles
- **Flame** — `renderFlame(el, HierarchyNode, HierarchyConfig?)` — Icicle/partition bars

### Flow
- **Sankey** — `renderSankey(el, FlowData, SankeyConfig?)` — Multi-column flow diagram
- **Pipeline Flow** — `renderPipelineFlow(el, FlowData, SankeyConfig?)` — Pipeline stages

### Relationships
- **Chord** — `renderChordDiagram(el, ChordData, ChordConfig?)` — Circular co-occurrence
- **Force Graph** — `renderForceGraph(el, {nodes, links}, ForceConfig?)` — Draggable network

### Multi-Dimensional
- **Parallel Coords** — `renderParallelCoords(el, ParallelDatum[], ParallelConfig)` — Brushable axes

### Progress
- **Gauge** — `renderGauge(el, value, GaugeConfig?)` — Radial progress arc

## Architecture

```
darn3/
├── core/           # Theme, tooltip, types, constants, utils
├── renderers/      # 13 pure D3 render functions
├── vue/            # Darn3Wrapper.vue + useDarn3() composable
└── index.ts        # Barrel export
```

### Pattern
Every renderer is a pure function:
```
render*(container: HTMLElement, data: T, config?: C): D3RenderResult
```

`D3RenderResult` always has `cleanup()` — call it to remove SVG + tooltips + listeners.

### Theme
Reads CSS custom properties automatically:
- `--bg-primary`, `--bg-secondary`, `--bg-card`
- `--text-primary`, `--text-secondary`
- `--accent-blue`, `--accent-green`, `--accent-yellow`, `--accent-red`
- `--border-color`

### Colors
`PALETTE` (10 colors), `PHASE_COLORS` (by milestone phase), `STATUS_COLORS` (by status).
`hashColor(key)` gives consistent color for any string. `paletteColor(index)` wraps around.
