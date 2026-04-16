<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useBars, type Bar, type BarFandom } from '@/composables/useBars'
import { apiFetch } from '@/composables/useApi'

const route = useRoute()
const bar = ref<Bar | null>(null)
const fandoms = ref<BarFandom[]>([])

onMounted(async () => {
  const id = route.params.id as string
  const [barRes, fandomRes] = await Promise.allSettled([
    apiFetch<Bar>(`/bars/${id}`),
    apiFetch<BarFandom[]>(`/fandoms/bar/${id}`),
  ])
  if (barRes.status === 'fulfilled') bar.value = barRes.value
  if (fandomRes.status === 'fulfilled') fandoms.value = fandomRes.value
})

function strengthLabel(s: string) {
  return { primary: 'HOME TURF', secondary: 'STRONG', friendly: 'FRIENDLY' }[s] || s
}
</script>

<template>
  <div class="bar-page">
    <router-link to="/" class="back-link">&larr; Back</router-link>

    <div v-if="bar" class="bar-detail">
      <h1>{{ bar.name }}</h1>
      <p class="address">{{ bar.address }} &middot; {{ bar.city }}, {{ bar.state }}</p>

      <div class="meta-row">
        <span v-if="bar.vibe" class="vibe-tag">{{ bar.vibe }}</span>
        <span v-if="bar.tv_count" class="meta-chip">{{ bar.tv_count }} TVs</span>
        <span v-if="bar.has_sound" class="meta-chip">Sound ON</span>
      </div>

      <div v-if="bar.vibe_tags.length" class="tags">
        <span v-for="tag in bar.vibe_tags" :key="tag" class="tag">{{ tag }}</span>
      </div>

      <section v-if="fandoms.length" class="fandoms">
        <h2>Fandom Affiliations</h2>
        <div v-for="f in fandoms" :key="f.id" class="fandom-row">
          <span class="strength" :class="f.strength">{{ strengthLabel(f.strength) }}</span>
          <span class="team-name">{{ f.team_id }}</span>
          <span class="source">({{ f.source }})</span>
        </div>
      </section>

      <p v-if="bar.notes" class="notes">{{ bar.notes }}</p>
    </div>
  </div>
</template>

<style scoped>
.bar-page {
  width: 700px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: 'Press Start 2P', 'Courier New', monospace;
}
.back-link { color: #ffaa00; text-decoration: none; font-size: 0.65rem; }
.bar-detail { margin-top: 1.5rem; }
h1 { font-size: 1rem; }
.address { color: #888; font-size: 0.65rem; margin-top: 0.5rem; }
.meta-row { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
.vibe-tag, .meta-chip {
  background: #222; color: #ffaa00; padding: 0.2rem 0.5rem;
  font-size: 0.55rem; border: 1px solid #333;
}
.tags { display: flex; gap: 0.4rem; margin-top: 0.75rem; flex-wrap: wrap; }
.tag { background: #111; color: #aaa; padding: 0.15rem 0.4rem; font-size: 0.5rem; border: 1px solid #222; }
h2 { font-size: 0.8rem; margin: 1.5rem 0 0.75rem; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
.fandom-row { display: flex; gap: 0.75rem; align-items: center; padding: 0.4rem 0; font-size: 0.65rem; }
.strength {
  padding: 0.15rem 0.4rem; font-size: 0.5rem; border: 1px solid;
}
.strength.primary { color: #0f0; border-color: #0f0; }
.strength.secondary { color: #ffaa00; border-color: #ffaa00; }
.strength.friendly { color: #88f; border-color: #88f; }
.source { color: #555; font-size: 0.5rem; }
.notes { color: #888; font-size: 0.6rem; margin-top: 1.5rem; line-height: 1.6; }
</style>
