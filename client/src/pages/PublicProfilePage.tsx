import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { FunnelChart } from '../components/charts/FunnelChart';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import * as stats from '../api/stats';

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<stats.StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    stats.publicStats(slug).then(setData).catch((e) => setError(e.message));
  }, [slug]);

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
      <header className="border-b border-ink-200/70 bg-white/70 backdrop-blur-md transition-colors dark:border-ink-800/70 dark:bg-ink-950/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink-900 dark:text-ink-100">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-500 to-accent-700 font-mono text-xs text-white shadow-glow">
              JT
            </span>
            JobTrackr
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 animate-fade-in">
        <div className="mb-8">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
            Public profile
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
            @{slug}
          </h1>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
            Anonymized job-search stats — no company names, no roles, just the funnel.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error === 'PublicProfile with key \'' + slug + '\' was not found.' || error.includes('not found')
              ? 'This profile is private or does not exist.'
              : error}
          </div>
        )}

        {!data ? (
          !error && <div className="text-ink-400">Loading…</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="card p-6">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">Total tracked</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">{data.total}</div>
            </div>
            <div className="card p-6">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">Interview rate</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">
                {data.interviewRate == null ? '—' : `${(data.interviewRate * 100).toFixed(1)}%`}
              </div>
            </div>
            <div className="card p-6">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">Offer rate</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">
                {data.offerRate == null ? '—' : `${(data.offerRate * 100).toFixed(1)}%`}
              </div>
            </div>

            <div className="card p-6 sm:col-span-3">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                Funnel
              </h3>
              <FunnelChart funnel={data.funnel} />
            </div>

            <div className="card p-6 sm:col-span-3">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                Velocity (last 12 weeks)
              </h3>
              <div className="text-ink-700 dark:text-ink-300">
                <TimeSeriesChart points={data.applicationsPerWeek} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
