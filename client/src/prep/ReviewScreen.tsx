import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { QuestionState, SessionState } from './types';
import { formatClock } from './useTimer';

interface Props {
  state: SessionState;
  startNewSession: () => void;
  retryWeak: () => void;
}

export function ReviewScreen({ state, startNewSession, retryWeak }: Props) {
  const graded = state.questions.filter((q) => q.feedback != null);
  const totalScore = graded.length
    ? Math.round(graded.reduce((s, q) => s + (q.feedback?.score ?? 0), 0) / graded.length)
    : 0;
  const elapsedSec = useMemo(() => {
    const start = new Date(state.startedAt).getTime();
    const end = new Date(state.finishedAt ?? new Date().toISOString()).getTime();
    return Math.max(0, Math.round((end - start) / 1000));
  }, [state.startedAt, state.finishedAt]);

  const byCategory = useMemo(() => groupByCategory(state.questions), [state.questions]);
  const weakCount = state.questions.filter((q) => (q.feedback?.score ?? 0) < 60).length;

  const ordered = useMemo(() => {
    const idxs = state.questions.map((_, i) => i);
    return idxs.sort((a, b) => {
      const fa = state.questions[a].flagged ? 0 : 1;
      const fb = state.questions[b].flagged ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (state.questions[a].feedback?.score ?? 0) - (state.questions[b].feedback?.score ?? 0);
    });
  }, [state.questions]);

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
          Review · {state.config.modeId === 'mock' ? 'Mock interview' : 'Practice'}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
          {totalScore >= 80 ? 'Strong showing.' : totalScore >= 60 ? 'Solid pass.' : totalScore >= 40 ? "There's a path here." : 'Lots to work on — that\'s the point.'}
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
          {graded.length} of {state.questions.length} graded · {formatClock(elapsedSec)} elapsed
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Avg score" value={`${totalScore}`} suffix="/100" tone={scoreTone(totalScore)} />
        <KpiCard label="Time taken" value={formatClock(elapsedSec)} suffix={state.config.totalTimeSec ? `/ ${formatClock(state.config.totalTimeSec)}` : ''} tone="text-ink-700 dark:text-ink-200" />
        <KpiCard label="Below 60" value={`${weakCount}`} suffix={`of ${state.questions.length}`} tone={weakCount === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
      </div>

      <section className="card p-5">
        <div className="mb-3 text-sm font-semibold text-ink-900 dark:text-ink-50">By category</div>
        <CategoryBars rows={byCategory} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-ink-500 dark:text-ink-400">
          Flagged questions and lowest scores surfaced first.
        </div>
        <div className="flex flex-wrap gap-2">
          {weakCount > 0 && (
            <button onClick={retryWeak} className="btn-ghost">
              Retry weak (&lt; 60)
            </button>
          )}
          <button onClick={startNewSession} className="btn-primary">
            New session
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {ordered.map((origIndex) => (
          <QuestionAccordion key={origIndex} index={origIndex} q={state.questions[origIndex]} />
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone: string }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-3xl font-semibold tabular-nums ${tone}`}>{value}</span>
        {suffix && <span className="text-sm text-ink-500 dark:text-ink-400">{suffix}</span>}
      </div>
    </div>
  );
}

function CategoryBars({ rows }: { rows: { category: string; avg: number; count: number }[] }) {
  if (rows.length === 0) {
    return <div className="text-sm text-ink-500 dark:text-ink-400">No graded questions.</div>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.category}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium text-ink-700 dark:text-ink-200">{r.category}</span>
            <span className="tabular-nums text-ink-500 dark:text-ink-400">
              {r.avg}/100 · {r.count} {r.count === 1 ? 'question' : 'questions'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div
              className={`h-full rounded-full ${barTone(r.avg)}`}
              style={{ width: `${Math.max(2, r.avg)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionAccordion({ index, q }: { index: number; q: QuestionState }) {
  const [open, setOpen] = useState(false);
  const score = q.feedback?.score ?? 0;
  return (
    <div className={`card overflow-hidden ${q.flagged ? 'ring-1 ring-amber-300 dark:ring-amber-500/40' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-ink-400">#{String(index + 1).padStart(2, '0')}</span>
            <CategoryBadge label={q.q.category} />
            <DifficultyBadge label={q.q.difficulty} />
            {q.flagged && <FlagBadge />}
          </div>
          <div className="truncate text-sm font-medium text-ink-900 dark:text-ink-50">
            {q.q.question}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {q.feedback ? (
            <span className={`text-xl font-semibold tabular-nums ${scoreTone(score)}`}>{score}</span>
          ) : (
            <span className="text-xs text-ink-400 dark:text-ink-500">— not graded —</span>
          )}
          <svg className={`h-4 w-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8l4 4 4-4" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-ink-200 p-5 dark:border-ink-800">
          <Block title="Your answer">
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink-700 dark:text-ink-300">
              {q.answer || <span className="italic text-ink-400 dark:text-ink-500">No answer.</span>}
            </pre>
          </Block>

          {q.feedback && (
            <>
              {q.feedback.strengths.length > 0 && (
                <Block title="Strengths">
                  <BulletList items={q.feedback.strengths} dot="bg-emerald-500" />
                </Block>
              )}
              {q.feedback.improvements.length > 0 && (
                <Block title="Improvements">
                  <BulletList items={q.feedback.improvements} dot="bg-rose-500" />
                </Block>
              )}
              <Block title="Model answer">
                <div className="rounded-md bg-ink-50 p-3 text-sm leading-relaxed text-ink-800 dark:bg-ink-950 dark:text-ink-200">
                  {q.feedback.modelAnswer}
                </div>
              </Block>
            </>
          )}

          {q.feedbackError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              Could not grade: {q.feedbackError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span className="text-ink-700 dark:text-ink-300">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function CategoryBadge({ label }: { label: string }) {
  const map: Record<string, string> = {
    Behavioral: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
    Technical: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
    'System Design': 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
    'Role-specific': 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
    'Culture fit': 'bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700'
  };
  const cls = map[label] ?? 'bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  );
}

function DifficultyBadge({ label }: { label: string }) {
  const cls =
    label === 'Easy'
      ? 'text-emerald-600 dark:text-emerald-400'
      : label === 'Hard'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-amber-600 dark:text-amber-400';
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
}

function FlagBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 00-1 1v13a1 1 0 102 0v-5h9.382a1 1 0 00.894-1.447L13.118 8 15.276 4.447A1 1 0 0014.382 3H4z" /></svg>
      Flagged
    </span>
  );
}

function groupByCategory(qs: QuestionState[]): { category: string; avg: number; count: number }[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const q of qs) {
    if (!q.feedback) continue;
    const cat = q.q.category;
    const cur = map.get(cat) ?? { sum: 0, count: 0 };
    cur.sum += q.feedback.score;
    cur.count += 1;
    map.set(cat, cur);
  }
  return Array.from(map.entries())
    .map(([category, { sum, count }]) => ({ category, avg: Math.round(sum / count), count }))
    .sort((a, b) => b.avg - a.avg);
}

function scoreTone(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-violet-600 dark:text-violet-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function barTone(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-violet-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}
