import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!user) {
    sessionStorage.setItem(
      "redirectAfterLogin",
      window.location.pathname + window.location.search
    );
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
