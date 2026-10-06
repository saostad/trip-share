import { BrowserRouter, Routes, Route } from 'react-router'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TripDetailPage } from '@/pages/TripDetailPage'
import { JoinTripPage } from '@/pages/JoinTripPage'
import { AdminPage } from '@/pages/AdminPage'

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
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
