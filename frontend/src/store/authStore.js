import { create } from 'zustand'

const ACCESS_KEY = 'chat_access_token'
const REFRESH_KEY = 'chat_refresh_token'
const USER_KEY = 'chat_user'
const THEME_KEY = 'chat_theme'

export const useAuthStore = create((set) => ({
  accessToken: localStorage.getItem(ACCESS_KEY) || '',
  refreshToken: localStorage.getItem(REFRESH_KEY) || '',
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  theme: localStorage.getItem(THEME_KEY) || 'light',
  setAuth(payload) {
    localStorage.setItem(ACCESS_KEY, payload.accessToken)
    localStorage.setItem(REFRESH_KEY, payload.refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))

    set({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    })
  },
  clearAuth() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    set({ accessToken: '', refreshToken: '', user: null })
  },
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user })
  },
  setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme)
    set({ theme })
  },
}))
