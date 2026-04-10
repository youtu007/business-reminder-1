import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)

  async function login(username, password) {
    const res = await api.auth.adminLogin(username, password)
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    return res
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function fetchProfile() {
    try {
      const res = await api.auth.getProfile()
      user.value = res.user
      localStorage.setItem('user', JSON.stringify(res.user))
    } catch (error) {
      logout()
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    login,
    logout,
    fetchProfile
  }
})
