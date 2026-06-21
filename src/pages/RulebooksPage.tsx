import { useAuthStore } from '@/stores/authStore'
import { RulebookLibrary } from '@/components/rulebook/RulebookLibrary'

export function RulebooksPage() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null

  return <RulebookLibrary userId={user.id} />
}
