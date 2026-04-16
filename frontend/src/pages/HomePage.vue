<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useBars } from '@/composables/useBars'
import { useGeolocation } from '@/composables/useGeolocation'
import { apiFetch } from '@/composables/useApi'
import { useDarn3, renderForceGraph, renderChordDiagram } from '@/lib/darn3'
import type { NetworkNode, NetworkLink, ChordData } from '@/lib/darn3'
import TeamPicker from '@/components/TeamPicker.vue'
import BarCard from '@/components/BarCard.vue'

const { teams, fetchTeams } = useBars()
const { lat, lng, loading: geoLoading, granted, requestLocation } = useGeolocation()

const selectedTeam = ref<string | null>(null)
const nearbyBars = ref<any[]>([])
const nearbyLoading = ref(false)
const graphData = ref<{ nodes: NetworkNode[]; links: NetworkLink[] } | null>(null)
const chordData = ref<ChordData | null>(null)
const barryQuip = ref('')

const barryQuips = [
  "Barry's scouting the area...",
  "Checking for Daves...",
  "Running interference...",
  "Coast looks clear...",
]

// Force graph
const { targetRef: forceRef } = useDarn3(
  () => graphData.value,
  (el, data) => renderForceGraph(el, data, {
    width: 860, height: 500, charge: -250,
    onNodeClick: (node: any) => {
      if (node.group === 'team') selectedTeam.value = node.label
    },
  })
)

// Chord diagram
const { targetRef: chordRef } = useDarn3(
  () => chordData.value,
  (el, data) => renderChordDiagram(el, data, { width: 500, height: 500 })
)

async function fetchNearby() {
  if (!lat.value || !lng.value) return
  nearbyLoading.value = true
  barryQuip.value = barryQuips[Math.floor(Math.random() * barryQuips.length)]
  try {
    const params = new URLSearchParams({
      lat: String(lat.value),
      lng: String(lng.value),
      radius: '100',
    })
    if (selectedTeam.value) params.set('team', selectedTeam.value)
    const res = await apiFetch<any>(`/bars/nearby?${params}`)
    nearbyBars.value = res.bars
    if (res.bars.length === 0) {
      barryQuip.value = selectedTeam.value
        ? `No ${selectedTeam.value} bars nearby. Dave wins this round.`
        : 'No bars in range. Dave has won this city.'
    } else {
      const low = res.bars.filter((b: any) => b.dave_score <= 25).length
      barryQuip.value = selectedTeam.value
        ? `${res.count} ${selectedTeam.value} bars found. ${low} are Dave-free.`
        : `${res.count} bars nearby. ${low} are Dave-free zones.`
    }
  } catch {
    barryQuip.value = "Barry's signal is down. Try again."
  } finally {
    nearbyLoading.value = false
  }
}

async function fetchGraph() {
  try {
    const res = await apiFetch<any>('/bars/graph')
    graphData.value = {
      nodes: res.nodes.map((n: any) => ({
        id: n.id,
        label: n.group === 'bar' ? `${n.label} (${n.meta})` : n.label,
        group: n.group,
        size: n.group === 'team' ? 30 : 10,
      })),
      links: res.links.map((l: any) => ({
        source: l.source, target: l.target,
        value: l.weight, label: l.label,
      })),
    }
    // Filter chord to only teams with connections
    const raw = res.chord
    const sums = raw.matrix.map((row: number[]) => row.reduce((a: number, b: number) => a + b, 0))
    const keep = sums.map((s: number, i: number) => s > 0 ? i : -1).filter((i: number) => i >= 0)
    if (keep.length > 1) {
      chordData.value = {
        labels: keep.map((i: number) => raw.labels[i]),
        matrix: keep.map((i: number) => keep.map((j: number) => raw.matrix[i][j])),
      }
    }
  } catch {
    // graph is non-critical
  }
}

watch(selectedTeam, () => {
  if (granted.value) fetchNearby()
})

onMounted(async () => {
  await fetchTeams()
  fetchGraph()
})

async function handleLocate() {
  const ok = await requestLocation()
  if (ok) fetchNearby()
}
</script>

<template>
  <div class="home-page">
    <header class="hero">
      <img src="@/assets/sprites/barry-64.png" alt="Barry" class="barry-sprite" />
      <h1>No Daves</h1>
      <p class="tagline">Find your home bar advantage where Dave's not there</p>
    </header>

    <!-- Team Picker -->
    <TeamPicker
      v-if="teams.length"
      :teams="teams"
      :selected="selectedTeam"
      @select="selectedTeam = $event"
    />

    <!-- Location -->
    <section class="locate-section">
      <button v-if="!granted" class="locate-btn" :disabled="geoLoading" @click="handleLocate">
        {{ geoLoading ? 'Locating...' : 'Find Bars Near Me' }}
      </button>
      <p v-if="barryQuip" class="barry-says">
        <img src="@/assets/sprites/barry-64.png" alt="" class="barry-mini" />
        {{ barryQuip }}
      </p>
    </section>

    <!-- Nearby Results -->
    <section v-if="nearbyBars.length" class="results">
      <h2>{{ selectedTeam ? `${selectedTeam} Bars` : 'Bars Near You' }}</h2>
      <div class="bar-grid">
        <BarCard v-for="bar in nearbyBars" :key="bar.id" :bar="bar" />
      </div>
    </section>

    <!-- Force Graph -->
    <section class="viz-section">
      <h2>Fandom Network</h2>
      <p class="viz-hint">Click a team to filter. Drag to explore.</p>
      <div ref="forceRef" class="viz-container"></div>
    </section>

    <!-- Chord Diagram -->
    <section v-if="chordData" class="viz-section">
      <h2>Rivalry Overlap</h2>
      <p class="viz-hint">Teams sharing the same cities. Thicker ribbons = more overlap.</p>
      <div ref="chordRef" class="viz-container chord-container"></div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: 'Press Start 2P', 'Courier New', monospace;
}

.hero {
  text-align: center;
  margin-bottom: 1.5rem;
}

.barry-sprite {
  image-rendering: pixelated;
  width: 64px;
  height: 64px;
}

.tagline {
  color: #888;
  font-size: 0.65rem;
  margin-top: 0.5rem;
}

/* Locate */
.locate-section {
  text-align: center;
  margin: 1.5rem 0;
}

.locate-btn {
  background: #ffaa00;
  color: #0a0a0f;
  border: none;
  padding: 0.6rem 1.2rem;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.6rem;
  cursor: pointer;
  transition: background 0.15s;
}

.locate-btn:hover {
  background: #ffc040;
}

.locate-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.barry-says {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  color: #ffaa00;
  font-size: 0.55rem;
}

.barry-mini {
  image-rendering: pixelated;
  width: 24px;
  height: 24px;
}

/* Results */
.results {
  margin-top: 1.5rem;
}

h2 {
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
}

.bar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

/* Visualizations */
.viz-section {
  margin-top: 2rem;
}

.viz-hint {
  color: #555;
  font-size: 0.45rem;
  margin-bottom: 0.5rem;
}

.viz-container {
  background: #0d0d14;
  border: 1px solid #333;
  min-height: 500px;
  overflow: hidden;
}

.chord-container {
  width: 500px;
  height: 500px;
  margin: 0 auto;
}
</style>
