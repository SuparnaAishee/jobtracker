import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { ApplicationForm } from '../components/ApplicationForm';
import * as api from '../api/jobApplications';
import { ApplicationStatus, StatusLabels, type JobApplication } from '../types';
import { HttpError } from '../api/client';
import { buildConnection, startWithRetry, type ApplicationChangedEvent } from '../realtime/notificationsHub';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const [items, setItems] = useState<JobApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [liveBadge, setLiveBadge] = useState<string | null>(null);
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { token } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.list({
        search: search || undefined,
        status: statusFilter === '' ? undefined : statusFilter,
        pageSize: 50
      });
      setItems(result.items);
      setTotal(result.totalItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  // SignalR — refresh the table whenever the server tells us this user's
  // applications changed (e.g. another browser tab created/deleted one).
  useEffect(() => {
    if (!token) return;
    const conn = buildConnection();
    const onChange = (evt: ApplicationChangedEvent) => {
      load();
      setLiveBadge(`Live: ${evt.kind}`);
      if (liveTimer.current) clearTimeout(liveTimer.current);
      liveTimer.current = setTimeout(() => setLiveBadge(null), 2500);
    };
    conn.on('applicationChanged', onChange);
    startWithRetry(conn);
    return () => {
      conn.off('applicationChanged', onChange);
      conn.stop().catch(() => {});
      if (liveTimer.current) clearTimeout(liveTimer.current);
    };
  }, [token, load]);

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const it of items) c[it.status] = (c[it.status] ?? 0) + 1;
    return c;
  }, [items]);

  const handleCreate = async (req: Parameters<typeof api.create>[0]) => {
    await api.create(req);
    setShowForm(false);
    await load();
  };

  const handleUpdate = async (req: Parameters<typeof api.create>[0]) => {
    if (!editing) return;
    await api.update(editing.id, req);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    try {
      await api.remove(id);
      await load();
    } catch (err) {
      if (err instanceof HttpError) setError(err.message);
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
            Pipeline
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
            Your applications
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-600 dark:text-ink-400">
            {total} {total === 1 ? 'application' : 'applications'} tracked
            {liveBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30 animate-fade-in">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                {liveBadge}
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? 'Close' : '+ New application'}
        </button>
      </div>

      {showForm && !editing && (
        <div className="card mb-8 p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-50">
            New application
          </h2>
          <ApplicationForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {editing && (
        <div className="card mb-8 p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-50">
            Edit application — <span className="text-ink-600 dark:text-ink-400">{editing.companyName}</span>
          </h2>
          <ApplicationForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { s: ApplicationStatus.Applied, ring: 'before:bg-blue-500' },
          { s: ApplicationStatus.Interviewing, ring: 'before:bg-violet-500' },
          { s: ApplicationStatus.Offer, ring: 'before:bg-emerald-500' },
          { s: ApplicationStatus.Rejected, ring: 'before:bg-rose-500' }
        ].map(({ s, ring }) => (
          <div
            key={s}
            className={`card relative overflow-hidden p-4 before:absolute before:inset-y-0 before:left-0 before:w-1 ${ring}`}
          >
            <div className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
              {StatusLabels[s]}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">
              {counts[s] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, position, or location…"
          className="input flex-1 min-w-[16rem]"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value === '' ? '' : (Number(e.target.value) as ApplicationStatus))
          }
          className="input w-auto"
        >
          <option value="">All statuses</option>
          {Object.entries(StatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-900/60 dark:text-ink-400">
            <tr>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Position</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Salary</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Applied</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-ink-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="text-ink-700 dark:text-ink-200">No applications yet.</div>
                  <div className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                    Click <b className="font-medium text-ink-900 dark:text-ink-100">New application</b> to add your first one.
                  </div>
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr
                  key={a.id}
                  className="transition-colors hover:bg-ink-50/60 dark:hover:bg-ink-850/60"
                >
                  <td className="px-5 py-4 font-medium text-ink-900 dark:text-ink-100">
                    {a.companyName}
                  </td>
                  <td className="px-5 py-4 text-ink-700 dark:text-ink-300">{a.position}</td>
                  <td className="px-5 py-4 text-ink-600 dark:text-ink-400">{a.location ?? '—'}</td>
                  <td className="px-5 py-4 tabular-nums text-ink-600 dark:text-ink-400">
                    {formatSalary(a)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-4 tabular-nums text-ink-600 dark:text-ink-400">
                    {new Date(a.appliedOn).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditing(a);
                          setShowForm(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-xs font-medium text-accent-600 transition-colors hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-xs font-medium text-ink-500 transition-colors hover:text-rose-600 dark:text-ink-400 dark:hover:text-rose-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function formatSalary(a: JobApplication): string {
  if (a.salaryMin == null && a.salaryMax == null) return '—';
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (a.salaryMin != null && a.salaryMax != null)
    return `${fmt(a.salaryMin)} – ${fmt(a.salaryMax)}`;
  return fmt((a.salaryMin ?? a.salaryMax) as number);
}
