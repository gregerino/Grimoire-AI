import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { initialize, ...state } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return state
}
