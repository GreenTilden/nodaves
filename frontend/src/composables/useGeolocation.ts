import { ref } from 'vue'

export function useGeolocation() {
  const lat = ref<number | null>(null)
  const lng = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const granted = ref(false)

  async function requestLocation(): Promise<boolean> {
    if (!navigator.geolocation) {
      error.value = 'Geolocation not supported'
      return false
    }

    loading.value = true
    error.value = null

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat.value = pos.coords.latitude
          lng.value = pos.coords.longitude
          granted.value = true
          loading.value = false
          resolve(true)
        },
        (err) => {
          error.value = err.message
          loading.value = false
          resolve(false)
        },
        { enableHighAccuracy: false, timeout: 10000 }
      )
    })
  }

  return { lat, lng, loading, error, granted, requestLocation }
}
