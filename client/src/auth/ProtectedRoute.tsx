import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-400">Loading…</div>
    );
  }
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}
