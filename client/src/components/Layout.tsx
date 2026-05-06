import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-ink-50 text-ink-900 transition-colors dark:bg-ink-950 dark:text-ink-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid bg-dot-grid opacity-60 dark:bg-dot-grid-dark"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-accent-glow"
      />

      <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-white/70 backdrop-blur-md transition-colors dark:border-ink-800/70 dark:bg-ink-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-500 to-accent-700 font-mono text-xs text-white shadow-glow">
                JT
              </span>
              JobTrackr
            </Link>
            {user && (
              <nav className="hidden items-center gap-1 sm:flex">
                <NavTab to="/dashboard" label="Pipeline" />
                <NavTab to="/analytics" label="Analytics" />
                <NavTab to="/assistant" label="AI assistant" />
                <NavTab to="/prep" label="Interview prep" />
                <NavTab to="/settings" label="Settings" />
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <>
                <span className="hidden text-sm text-ink-600 dark:text-ink-400 sm:block">
                  {user.displayName}
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="btn-ghost"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 animate-fade-in">{children}</main>
    </div>
  );
}

function NavTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900'
            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-850 dark:hover:text-ink-100'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
