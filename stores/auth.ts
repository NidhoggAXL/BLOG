import { defineStore } from 'pinia'
import type { AuthUser } from '~/types/auth'

export type { AuthUser } from '~/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const checked = ref(false)
  const loading = ref(false)

  const fetchCredentials = { credentials: 'include' as const }

  async function fetchMe(): Promise<AuthUser | null> {
    loading.value = true
    try {
      const data = await $fetch<AuthUser>('/api/auth/me', {
        ...fetchCredentials,
        // SSR 刷新时需要透传原请求 Cookie，否则会误判未登录并闪到 /login
        ...(import.meta.server ? { headers: useRequestHeaders(['cookie']) } : {}),
      })
      user.value = {
        id: data.id,
        username: data.username,
        displayName: data.displayName ?? null,
      }
      return user.value
    } catch {
      user.value = null
      return null
    } finally {
      loading.value = false
      checked.value = true
    }
  }

  async function logout() {
    user.value = null
    checked.value = false
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        ...fetchCredentials,
      })
    } finally {
      checked.value = true
      await navigateTo(
        { path: '/login', query: { loggedOut: '1' } },
        { replace: true },
      )
    }
  }

  return {
    user,
    checked,
    loading,
    fetchMe,
    logout,
  }
})
