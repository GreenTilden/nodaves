<script setup lang="ts">
import { onMounted } from 'vue'
import { useBars } from '@/composables/useBars'

const { bars, teams, cities, loading, fetchBars, fetchTeams, fetchCities } = useBars()

onMounted(async () => {
  await Promise.allSettled([fetchBars(), fetchTeams(), fetchCities()])
})
</script>

<template>
  <div class="home-page">
    <header class="hero">
      <img src="@/assets/sprites/barry-64.png" alt="Barry" class="barry-sprite" />
      <h1>Home Bar Advantage</h1>
      <p class="tagline">Find your fandom's bar in any city</p>
    </header>

    <section v-if="loading" class="loading">Loading...</section>

    <section v-else class="content">
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-num">{{ bars.length }}</span>
          <span class="stat-label">Bars Scouted</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ teams.length }}</span>
          <span class="stat-label">Teams Tracked</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ cities.length }}</span>
          <span class="stat-label">City Guides</span>
        </div>
      </div>

      <section v-if="cities.length" class="city-list">
        <h2>City Guides</h2>
        <div class="city-grid">
          <router-link
            v-for="city in cities"
            :key="city.id"
            :to="`/city/${city.slug}`"
            class="city-card"
          >
            <strong>{{ city.city }}, {{ city.state }}</strong>
            <span>{{ city.bar_count }} bars</span>
          </router-link>
        </div>
      </section>

      <section v-if="bars.length" class="bar-list">
        <h2>Recent Bars</h2>
        <div class="bar-grid">
          <router-link
            v-for="bar in bars.slice(0, 12)"
            :key="bar.id"
            :to="`/bar/${bar.id}`"
            class="bar-card"
          >
            <strong>{{ bar.name }}</strong>
            <span class="bar-meta">{{ bar.city }}, {{ bar.state }}</span>
            <span v-if="bar.vibe" class="vibe-tag">{{ bar.vibe }}</span>
          </router-link>
        </div>
      </section>

      <section v-if="teams.length" class="team-list">
        <h2>Teams</h2>
        <div class="team-grid">
          <div v-for="team in teams" :key="team.id" class="team-chip">
            <span
              class="color-dot"
              :style="{ background: team.colors[0] || '#666' }"
            ></span>
            {{ team.name }}
          </div>
        </div>
      </section>
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
  margin-bottom: 2rem;
}

.barry-sprite {
  image-rendering: pixelated;
  width: 64px;
  height: 64px;
}

.tagline {
  color: #888;
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.stats-row {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border: 2px solid #333;
  background: #111;
  min-width: 120px;
}

.stat-num {
  font-size: 1.5rem;
  color: #ffaa00;
}

.stat-label {
  font-size: 0.6rem;
  color: #aaa;
  margin-top: 0.25rem;
}

h2 {
  font-size: 0.85rem;
  margin: 1.5rem 0 0.75rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
}

.city-grid, .bar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.city-card, .bar-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px solid #333;
  background: #0d0d14;
  color: #e5e5f0;
  text-decoration: none;
  font-size: 0.7rem;
  transition: border-color 0.15s;
}

.city-card:hover, .bar-card:hover {
  border-color: #ffaa00;
}

.bar-meta {
  color: #888;
  font-size: 0.6rem;
}

.vibe-tag {
  display: inline-block;
  background: #222;
  color: #ffaa00;
  padding: 0.15rem 0.4rem;
  font-size: 0.55rem;
  border-radius: 2px;
  width: fit-content;
}

.team-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.team-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid #333;
  font-size: 0.6rem;
  background: #111;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.loading {
  text-align: center;
  color: #888;
  padding: 3rem;
}
</style>
