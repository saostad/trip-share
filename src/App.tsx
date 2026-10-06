import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TripPage } from "@/pages/trip/TripPage";
import { OverviewTab } from "@/pages/trip/tabs/OverviewTab";
import { ExpensesTab } from "@/pages/trip/tabs/ExpensesTab";
import { SettleTab } from "@/pages/trip/tabs/SettleTab";
import { PeopleTab } from "@/pages/trip/tabs/PeopleTab";
import { JoinTripPage } from "@/pages/JoinTripPage";

const AdminPage = lazy(() =>
  import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);

const HowItWorksPage = lazy(() =>
  import("@/pages/HowItWorksPage").then((m) => ({ default: m.HowItWorksPage })),
);

const DevPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import("@/dev/PreviewPage").then((m) => ({ default: m.PreviewPage })),
    )
  : null;

function LazyPageFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
        role="status"
        aria-label={label}
      />
    </div>
  );
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
            path="/how-it-works"
            element={
              <Suspense fallback={<LazyPageFallback label="Loading page" />}>
                <HowItWorksPage />
              </Suspense>
            }
          />
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
                <TripPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewTab />} />
            <Route path="expenses" element={<ExpensesTab />} />
            <Route path="settle" element={<SettleTab />} />
            <Route path="people" element={<PeopleTab />} />
            <Route path="*" element={<Navigate to=".." replace />} />
          </Route>
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
                <Suspense
                  fallback={<LazyPageFallback label="Loading admin page" />}
                >
                  <AdminPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          {import.meta.env.DEV && DevPreviewPage && (
            <Route
              path="/dev/preview"
              element={
                <Suspense
                  fallback={<LazyPageFallback label="Loading preview" />}
                >
                  <DevPreviewPage />
                </Suspense>
              }
            />
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
