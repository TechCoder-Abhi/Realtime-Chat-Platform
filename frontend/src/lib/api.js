import { useAuthStore } from '../store/authStore'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4600'

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(!isFormData && body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.error?.message || 'Request failed')
    error.status = response.status
    throw error
  }

  return payload
}

export async function requestWithRefresh(path, options = {}) {
  const store = useAuthStore.getState()

  try {
    return await apiRequest(path, { ...options, token: store.accessToken })
  } catch (error) {
    if (error.status !== 401 || !store.refreshToken) {
      throw error
    }

    const refreshed = await apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: store.refreshToken },
    })

    store.setAuth(refreshed.data)
    return apiRequest(path, {
      ...options,
      token: refreshed.data.accessToken,
    })
  }
}
