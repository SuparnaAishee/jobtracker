import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { FunnelChart } from '../components/charts/FunnelChart';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import * as stats from '../api/stats';
import { StatusLabels, type ApplicationStatus } from '../types';

export function AnalyticsPage() {
  const [data, setData] = useState<stats.StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    stats.myStats().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
          Analytics
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
          Pipeline insights
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
          Spot leaks in your funnel and track velocity over time.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-ink-400">Loading…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <KpiCard label="Total tracked" value={data.total.toString()} />
          <KpiCard
            label="Interview rate"
            value={data.interviewRate == null ? '—' : `${(data.interviewRate * 100).toFixed(1)}%`}
            hint="Interviewing ÷ Total"
          />
          <KpiCard
            label="Offer rate"
            value={data.offerRate == null ? '—' : `${(data.offerRate * 100).toFixed(1)}%`}
            hint="(Offer + Accepted) ÷ Total"
          />

          <div className="card p-6 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
              Pipeline funnel
            </h3>
            <FunnelChart funnel={data.funnel} />
          </div>

          <div className="card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
              Status breakdown
            </h3>
            <ul className="space-y-2 text-sm">
              {data.byStatus.map((b) => (
                <li key={b.status} className="flex items-center justify-between">
                  <span className="text-ink-700 dark:text-ink-300">
                    {StatusLabels[b.status as ApplicationStatus]}
                  </span>
                  <span className="tabular-nums font-medium text-ink-900 dark:text-ink-100">
                    {b.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6 lg:col-span-3">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
              Applications per week
            </h3>
            <div className="text-ink-700 dark:text-ink-300">
              <TimeSeriesChart points={data.applicationsPerWeek} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-6">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-500 dark:text-ink-500">{hint}</div>}
    </div>
  );
}
