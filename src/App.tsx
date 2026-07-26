import { BrowserRouter, Routes, Route } from 'react-router'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TripDetailPage } from '@/pages/TripDetailPage'
import { JoinTripPage } from '@/pages/JoinTripPage'

function BuildFooter() {
  const builtAt = new Date(__BUILD_TIME__).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/80 px-3 py-1 text-center text-[10px] text-muted-foreground backdrop-blur-sm">
      build {__BUILD_COMMIT__} · {builtAt}
    </footer>
  )
}

function App() {
  return (
    <BrowserRouter>
      <InstallPrompt />
      <Toaster richColors position="top-right" />
      <div className="min-h-dvh pb-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/:tripId"
            element={
              <ProtectedRoute>
                <TripDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join/:shareToken"
            element={
              <ProtectedRoute>
                <JoinTripPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      <BuildFooter />
    </BrowserRouter>
  )
}

export default App
