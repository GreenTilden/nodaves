import { ref } from 'vue'
import { apiFetch } from './useApi'

export interface Bar {
  id: string
  name: string
  address: string
  city: string
  state: string
  lat: number | null
  lng: number | null
  vibe: string | null
  vibe_tags: string[]
  tv_count: number | null
  has_sound: boolean | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  mascot: string | null
  sport: string | null
  conference: string | null
  region: string | null
  colors: string[]
  created_at: string
}

export interface BarFandom {
  id: string
  bar_id: string
  team_id: string
  strength: 'primary' | 'secondary' | 'friendly'
  source: 'curator' | 'ai' | 'verified'
  confidence: number | null
  evidence: string[]
  created_at: string
}

export interface CityGuide {
  id: string
  city: string
  state: string
  slug: string
  bar_count: number
  top_fandoms: string[]
  generated_blurb: string | null
  created_at: string
}

export function useBars() {
  const bars = ref<Bar[]>([])
  const teams = ref<Team[]>([])
  const cities = ref<CityGuide[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBars(params?: { city?: string; state?: string; team?: string }) {
    loading.value = true
    error.value = null
    try {
      const qs = new URLSearchParams()
      if (params?.city) qs.set('city', params.city)
      if (params?.state) qs.set('state', params.state)
      if (params?.team) qs.set('team', params.team)
      const query = qs.toString() ? `?${qs}` : ''
      bars.value = await apiFetch<Bar[]>(`/bars/${query}`)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchTeams() {
    try {
      teams.value = await apiFetch<Team[]>('/teams/')
    } catch (e: any) {
      error.value = e.message
    }
  }

  async function fetchCities() {
    try {
      cities.value = await apiFetch<CityGuide[]>('/cities/')
    } catch (e: any) {
      error.value = e.message
    }
  }

  async function fetchBarFandoms(barId: string): Promise<BarFandom[]> {
    return apiFetch<BarFandom[]>(`/fandoms/bar/${barId}`)
  }

  return { bars, teams, cities, loading, error, fetchBars, fetchTeams, fetchCities, fetchBarFandoms }
}
