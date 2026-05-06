import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { HttpError } from '../api/client';
import { AuthShell } from './LoginPage';

export function RegisterPage() {
  const { register, token, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (token) return <Navigate to="/dashboard" replace />;

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof HttpError) {
        const messages = err.body?.errors
          ? Object.values(err.body.errors).flat().join(' ')
          : err.body?.detail ?? err.body?.title ?? err.message;
        setError(messages);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Track applications, prep, and pipeline analytics">
      <form onSubmit={handle} className="space-y-4">
        <Field label="Display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="input"
          />
        </Field>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="input"
          />
          <span className="mt-1 block text-xs text-ink-500 dark:text-ink-500">
            At least 8 characters with upper, lower, and a digit.
          </span>
        </Field>
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-600 dark:text-ink-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-ink-900 underline-offset-4 hover:underline dark:text-ink-100">
          Sign in
        </Link>
      </p>
    </AuthShell>
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
