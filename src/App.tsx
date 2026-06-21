import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sentry } from '@/lib/sentry'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CampaignPage } from '@/pages/CampaignPage'
import { PlayPage } from '@/pages/PlayPage'
import { RulebooksPage } from '@/pages/RulebooksPage'

function ErrorFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="text-center space-y-4 max-w-md px-6">
        <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
        <p className="text-gray-400">An unexpected error occurred. The error has been reported.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

export default function App() {
  useAuth()

  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/campaign/:id" element={<CampaignPage />} />
            <Route path="/campaign/:id/play" element={<PlayPage />} />
            <Route path="/rulebooks" element={<RulebooksPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}
