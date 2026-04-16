<script setup lang="ts">
defineProps<{
  bar: {
    id: string
    name: string
    address: string
    city: string
    state: string
    vibe: string | null
    vibe_tags: string[]
    tv_count: number | null
    has_sound: boolean | null
    distance_mi: number | null
    dave_score: number
    fandom?: {
      team: string
      strength: string
      colors: string[]
    }
  }
}>()

function daveLabel(score: number): string {
  if (score <= 15) return 'DAVE FREE'
  if (score <= 35) return 'DAVE UNLIKELY'
  if (score <= 55) return 'DAVE POSSIBLE'
  if (score <= 75) return 'DAVE PROBABLE'
  return 'DAVE ZONE'
}

function daveColor(score: number): string {
  if (score <= 15) return '#0f0'
  if (score <= 35) return '#8f0'
  if (score <= 55) return '#ffaa00'
  if (score <= 75) return '#f80'
  return '#f00'
}
</script>

<template>
  <router-link :to="`/bar/${bar.id}`" class="bar-card">
    <div class="card-header">
      <strong>{{ bar.name }}</strong>
      <div class="dave-badge" :style="{ color: daveColor(bar.dave_score), borderColor: daveColor(bar.dave_score) }">
        <span class="dave-num">{{ bar.dave_score }}</span>
        <span class="dave-label">{{ daveLabel(bar.dave_score) }}</span>
      </div>
    </div>

    <span class="bar-meta">
      {{ bar.city }}, {{ bar.state }}
      <template v-if="bar.distance_mi !== null"> · {{ bar.distance_mi }}mi</template>
    </span>

    <div class="bar-details">
      <span v-if="bar.vibe" class="vibe-tag">{{ bar.vibe }}</span>
      <span v-if="bar.tv_count" class="detail-chip">{{ bar.tv_count }} TVs</span>
      <span v-if="bar.has_sound" class="detail-chip">Sound ON</span>
    </div>

    <div v-if="bar.fandom" class="fandom-badge" :style="{ borderColor: bar.fandom.colors[0] || '#666' }">
      <span class="fandom-dot" :style="{ background: bar.fandom.colors[0] || '#666' }"></span>
      {{ bar.fandom.team }} · {{ bar.fandom.strength }}
    </div>
  </router-link>
</template>

<style scoped>
.bar-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  border: 1px solid #333;
  background: #0d0d14;
  color: #e5e5f0;
  text-decoration: none;
  font-size: 0.65rem;
  transition: border-color 0.15s;
}

.bar-card:hover {
  border-color: #ffaa00;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.dave-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid;
  padding: 0.15rem 0.3rem;
  min-width: 50px;
  flex-shrink: 0;
}

.dave-num {
  font-size: 0.8rem;
  font-weight: bold;
}

.dave-label {
  font-size: 0.35rem;
  white-space: nowrap;
}

.bar-meta {
  color: #888;
  font-size: 0.55rem;
}

.bar-details {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.vibe-tag {
  background: #222;
  color: #ffaa00;
  padding: 0.1rem 0.3rem;
  font-size: 0.45rem;
}

.detail-chip {
  background: #1a1a1a;
  color: #aaa;
  padding: 0.1rem 0.3rem;
  font-size: 0.45rem;
}

.fandom-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid;
  padding: 0.2rem 0.4rem;
  font-size: 0.5rem;
  margin-top: 0.2rem;
}

.fandom-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
</style>
