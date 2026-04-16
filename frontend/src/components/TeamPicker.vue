<script setup lang="ts">
import { type Team } from '@/composables/useBars'

const props = defineProps<{
  teams: Team[]
  selected: string | null
}>()

const emit = defineEmits<{
  select: [teamName: string | null]
}>()

function toggle(name: string) {
  emit('select', props.selected === name ? null : name)
}
</script>

<template>
  <div class="team-picker">
    <h2>Who's your team?</h2>
    <div class="team-grid">
      <button
        v-for="team in teams"
        :key="team.id"
        class="team-btn"
        :class="{ active: selected === team.name }"
        :style="{
          '--team-color': team.colors[0] || '#666',
          '--team-bg': (team.colors[0] || '#666') + '22',
        }"
        @click="toggle(team.name)"
      >
        <span class="color-dot" :style="{ background: team.colors[0] || '#666' }"></span>
        <span class="team-name">{{ team.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.team-picker h2 {
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  text-align: center;
}

.team-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.team-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border: 2px solid #333;
  background: #111;
  color: #e5e5f0;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.team-btn:hover {
  border-color: var(--team-color);
  background: var(--team-bg);
}

.team-btn.active {
  border-color: var(--team-color);
  background: var(--team-bg);
  box-shadow: 0 0 8px var(--team-color);
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.team-name {
  white-space: nowrap;
}
</style>
