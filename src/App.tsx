import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TripDetailPage } from '@/pages/TripDetailPage'
import { JoinTripPage } from '@/pages/JoinTripPage'

const AdminPage = lazy(() =>
  import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })),
)

const DevPreviewPage = import.meta.env.DEV
  ? lazy(() => import('@/dev/PreviewPage').then((m) => ({ default: m.PreviewPage })))
  : null

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
        role="status"
        aria-label="Loading admin page"
      />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <InstallPrompt />
      <Toaster richColors position="top-right" />
      <div className="min-h-dvh">
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
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Suspense fallback={<AdminFallback />}>
                  <AdminPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          {import.meta.env.DEV && DevPreviewPage && (
            <Route
              path="/dev/preview"
              element={
                <Suspense fallback={<AdminFallback />}>
                  <DevPreviewPage />
                </Suspense>
              }
            />
          )}
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
