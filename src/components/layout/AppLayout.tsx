import { Outlet, Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import logo from '@/assets/logo.png'

export function AppLayout() {
  const { user, signOut } = useAuthStore()

  return (
    <div className="flex min-h-screen flex-col bg-midnight">
      <header className="border-b border-navy bg-dark-navy/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-gold hover:text-gold-light transition-colors">
            <img src={logo} alt="Grimoire" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-wide">Grimoire</span>
          </Link>

          <div className="flex items-center gap-3">
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="h-7 w-7 rounded-full ring-1 ring-gold/30"
              />
            )}
            <span className="text-sm text-gray-400">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <button
              onClick={signOut}
              className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-gray-300 transition-colors"
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
