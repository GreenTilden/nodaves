<script setup lang="ts">
import { onMounted } from 'vue'
import { useBars } from '@/composables/useBars'

const { teams, fetchTeams } = useBars()

onMounted(() => fetchTeams())
</script>

<template>
  <div class="teams-page">
    <router-link to="/" class="back-link">&larr; Home</router-link>
    <h1>Teams</h1>
    <div class="team-grid">
      <div v-for="team in teams" :key="team.id" class="team-card">
        <div class="color-bar">
          <span
            v-for="(c, i) in team.colors"
            :key="i"
            class="color-swatch"
            :style="{ background: c }"
          ></span>
        </div>
        <strong>{{ team.name }}</strong>
        <span v-if="team.mascot" class="mascot">{{ team.mascot }}</span>
        <span class="meta">{{ team.conference }} &middot; {{ team.sport?.toUpperCase() }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.teams-page {
  width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: 'Press Start 2P', 'Courier New', monospace;
}
.back-link { color: #ffaa00; text-decoration: none; font-size: 0.65rem; }
h1 { font-size: 1rem; margin: 1rem 0; }
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}
.team-card {
  display: flex; flex-direction: column; gap: 0.3rem;
  padding: 0.75rem; border: 1px solid #333; background: #0d0d14;
  font-size: 0.7rem;
}
.color-bar { display: flex; gap: 2px; margin-bottom: 0.25rem; }
.color-swatch { width: 20px; height: 6px; }
.mascot { color: #888; font-size: 0.55rem; }
.meta { color: #666; font-size: 0.5rem; }
</style>
