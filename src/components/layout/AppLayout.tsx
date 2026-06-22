import { Outlet, Link } from 'react-router-dom'
import { LogOut, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import logo from '@/assets/logo.png'

export function AppLayout() {
  const { user, signOut } = useAuthStore()

  return (
    <div className="flex min-h-screen flex-col bg-midnight">
      <header className="border-b border-navy bg-dark-navy/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-gold hover:text-gold-light transition-colors">
            <img src={logo} alt="Grimoire" className="h-8 w-8" />
            <span className="text-lg font-display font-bold tracking-wide">Grimoire</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/rulebooks"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-stone font-ui hover:bg-navy hover:text-gold transition-colors focus-ring"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Rulebooks</span>
            </Link>
            <Avatar
              src={user?.user_metadata?.avatar_url}
              fallback={user?.user_metadata?.full_name || user?.email || ''}
              size="sm"
              ring
            />
            <span className="text-sm text-stone font-ui">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-mist hover:bg-navy hover:text-parchment transition-colors focus-ring"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
