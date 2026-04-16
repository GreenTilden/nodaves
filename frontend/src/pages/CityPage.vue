<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useBars, type Bar, type CityGuide } from '@/composables/useBars'
import { apiFetch } from '@/composables/useApi'

const route = useRoute()
const { bars, fetchBars } = useBars()
const city = ref<CityGuide | null>(null)

onMounted(async () => {
  const slug = route.params.slug as string
  try {
    city.value = await apiFetch<CityGuide>(`/cities/${slug}`)
    if (city.value) {
      await fetchBars({ city: city.value.city, state: city.value.state })
    }
  } catch {
    // city guide may not exist yet, just load bars
  }
})
</script>

<template>
  <div class="city-page">
    <router-link to="/" class="back-link">&larr; All Cities</router-link>

    <div v-if="city" class="city-header">
      <h1>{{ city.city }}, {{ city.state }}</h1>
      <p v-if="city.generated_blurb" class="blurb">{{ city.generated_blurb }}</p>
      <div v-if="city.top_fandoms.length" class="top-fandoms">
        <span v-for="f in city.top_fandoms" :key="f" class="fandom-tag">{{ f }}</span>
      </div>
    </div>

    <section class="bar-list">
      <h2>{{ bars.length }} Bars</h2>
      <div class="bar-grid">
        <router-link
          v-for="bar in bars"
          :key="bar.id"
          :to="`/bar/${bar.id}`"
          class="bar-card"
        >
          <strong>{{ bar.name }}</strong>
          <span class="address">{{ bar.address }}</span>
          <span v-if="bar.vibe" class="vibe-tag">{{ bar.vibe }}</span>
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
.city-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: 'Press Start 2P', 'Courier New', monospace;
}
.back-link {
  color: #ffaa00;
  text-decoration: none;
  font-size: 0.65rem;
}
.city-header { margin: 1.5rem 0; }
h1 { font-size: 1.1rem; }
.blurb { color: #aaa; font-size: 0.65rem; margin-top: 0.5rem; line-height: 1.6; }
.top-fandoms { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
.fandom-tag {
  background: #222;
  color: #ffaa00;
  padding: 0.2rem 0.5rem;
  font-size: 0.55rem;
  border: 1px solid #333;
}
h2 { font-size: 0.85rem; margin: 1.5rem 0 0.75rem; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
.bar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}
.bar-card {
  display: flex; flex-direction: column; gap: 0.25rem;
  padding: 0.75rem; border: 1px solid #333; background: #0d0d14;
  color: #e5e5f0; text-decoration: none; font-size: 0.7rem;
}
.bar-card:hover { border-color: #ffaa00; }
.address { color: #888; font-size: 0.6rem; }
.vibe-tag {
  display: inline-block; background: #222; color: #ffaa00;
  padding: 0.15rem 0.4rem; font-size: 0.55rem; width: fit-content;
}
</style>
