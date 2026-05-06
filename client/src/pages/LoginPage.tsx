import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { HttpError } from '../api/client';
import { ThemeToggle } from '../components/ThemeToggle';

export function LoginPage() {
  const { login, token, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (token) return <Navigate to="/dashboard" replace />;

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.body?.detail ?? err.body?.title ?? err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your job-search workspace">
      <form onSubmit={handle} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
        </Field>
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-600 dark:text-ink-400">
        New here?{' '}
        <Link to="/register" className="font-medium text-ink-900 underline-offset-4 hover:underline dark:text-ink-100">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-ink-50 transition-colors dark:bg-ink-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid bg-dot-grid opacity-60 dark:bg-dot-grid-dark"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-accent-glow"
      />
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent-500 to-accent-700 font-mono text-sm text-white shadow-glow">
            JT
          </span>
          <span className="text-lg font-semibold tracking-tight">JobTrackr</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
          {title}
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{subtitle}</p>
        <div className="card mt-8 p-6 animate-slide-up">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
