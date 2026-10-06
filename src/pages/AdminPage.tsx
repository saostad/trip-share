import { Link } from "react-router";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";

export function AdminPage() {
  const { adminLoading, isAdmin } = useAuth();

  if (adminLoading) {
    return (
      <div>
        <Header />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
            role="status"
            aria-label="Loading admin status"
          />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-10 text-center">
          <p className="text-lg font-medium">You&apos;re not authorized to view this page.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Go back home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-bold">Admin</h1>
      </main>
    </div>
  );
}
