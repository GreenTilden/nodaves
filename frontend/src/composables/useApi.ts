const BASE = '/api'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${url}`)
  }
  return res.json()
}
