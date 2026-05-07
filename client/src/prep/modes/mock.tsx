import { useState } from 'react';
import { ReviewScreen } from '../ReviewScreen';
import { formatClock, useCountdown } from '../useTimer';
import type { RunningProps, SessionMode, SetupExtrasProps } from '../types';

const TIME_OPTIONS = [
  { id: 15, label: '15 min' },
  { id: 30, label: '30 min' },
  { id: 45, label: '45 min' },
  { id: 60, label: '60 min' }
];

const PER_Q_OPTIONS = [
  { id: 60, label: '1 min' },
  { id: 120, label: '2 min' },
  { id: 180, label: '3 min' },
  { id: 300, label: '5 min' }
];

export const mockMode: SessionMode = {
  id: 'mock',
  label: 'Mock interview',
  tagline: 'Timed. One question at a time. Submit at the end.',
  bullets: [
    'Global countdown auto-submits at zero',
    'Model answers locked until you submit',
    'Flag questions for later review',
    'Final report grades every answer'
  ],
  defaults: {
    totalTimeSec: 30 * 60,
    perQuestionSoftLimitSec: 180,
    lockModelAnswers: true
  },
  SetupExtras: MockSetupExtras,
  Running: MockRunning,
  Review: ReviewScreen
};

function MockSetupExtras({ config, setConfig }: SetupExtrasProps) {
  return (
    <div className="space-y-4">
      <ChipRow
        label="Total time"
        options={TIME_OPTIONS}
        value={config.totalTimeSec ?? 30 * 60}
        onChange={(v) => setConfig({ totalTimeSec: v })}
      />
      <ChipRow
        label="Per-question soft hint"
        options={PER_Q_OPTIONS}
        value={config.perQuestionSoftLimitSec ?? 180}
        onChange={(v) => setConfig({ perQuestionSoftLimitSec: v })}
      />
      <p className="text-[11px] text-ink-500 dark:text-ink-500">
        At zero the test auto-submits. The per-question hint is just a suggestion — the global timer is what enforces.
      </p>
    </div>
  );
}

function MockRunning({
  state,
  setQuestion,
  setCurrentIndex,
  setRemaining,
  submitAll
}: RunningProps) {
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const idx = state.currentIndex;
  const cur = state.questions[idx];
  const total = state.questions.length;
  const remaining = state.remainingSec ?? 0;
  const submitting = state.phase === 'submitting';

  useCountdown({
    remainingSec: state.remainingSec,
    paused: submitting,
    onTick: setRemaining,
    onZero: submitAll
  });

  const answeredCount = state.questions.filter((q) => q.answer.trim()).length;
  const unanswered = total - answeredCount;
  const lowTime = remaining > 0 && remaining <= 60;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
            Mock interview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
            Question {idx + 1} of {total}
          </h1>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-2xl font-semibold tabular-nums ${
          lowTime
            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30'
            : 'bg-ink-100 text-ink-900 ring-1 ring-ink-200 dark:bg-ink-800 dark:text-ink-100 dark:ring-ink-700'
        }`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 1.5" />
            <path d="M9 2h6" />
          </svg>
          {formatClock(remaining)}
        </div>
      </div>

      <Palette
        questions={state.questions}
        currentIndex={idx}
        onPick={setCurrentIndex}
      />

      <div className="card p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-400">#{String(idx + 1).padStart(2, '0')}</span>
          <CategoryBadge label={cur.q.category} />
          <DifficultyBadge label={cur.q.difficulty} />
          {state.config.perQuestionSoftLimitSec && (
            <span className="text-[11px] text-ink-400 dark:text-ink-500">
              suggested {formatClock(state.config.perQuestionSoftLimitSec)}
            </span>
          )}
          <button
            onClick={() => setQuestion(idx, { flagged: !cur.flagged })}
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors ${
              cur.flagged
                ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30'
                : 'text-ink-500 ring-ink-200 hover:bg-ink-50 dark:text-ink-400 dark:ring-ink-800 dark:hover:bg-ink-800/40'
            }`}
          >
            {cur.flagged ? '★ Flagged' : '☆ Flag for review'}
          </button>
        </div>
        <p className="text-base font-medium leading-relaxed text-ink-900 dark:text-ink-50">
          {cur.q.question}
        </p>
        <p className="mt-1 text-xs italic text-ink-500 dark:text-ink-400">
          Why they ask: {cur.q.whyAsked}
        </p>

        <div className="mt-4">
          <span className="label">Your answer</span>
          <textarea
            value={cur.answer}
            onChange={(e) => setQuestion(idx, { answer: e.target.value })}
            rows={8}
            placeholder="Walk through your thinking. STAR for behavioral, structured reasoning for technical."
            className="input resize-y"
            autoFocus
          />
          <div className="mt-1 text-right text-[11px] text-ink-500 dark:text-ink-500">
            {wordCount(cur.answer)} words
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(Math.max(0, idx - 1))}
          disabled={idx === 0 || submitting}
          className="btn-ghost"
        >
          ← Previous
        </button>
        <div className="text-xs text-ink-500 dark:text-ink-400">
          {answeredCount} of {total} answered
        </div>
        {idx < total - 1 ? (
          <button
            onClick={() => setCurrentIndex(idx + 1)}
            disabled={submitting}
            className="btn-primary"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => setConfirmingSubmit(true)}
            disabled={submitting}
            className="btn-primary"
          >
            Submit interview
          </button>
        )}
      </div>

      {submitting && <SubmittingOverlay state={state} />}

      {confirmingSubmit && !submitting && (
        <ConfirmModal
          unanswered={unanswered}
          onConfirm={() => {
            setConfirmingSubmit(false);
            submitAll();
          }}
          onCancel={() => setConfirmingSubmit(false)}
        />
      )}
    </div>
  );
}

function Palette({
  questions,
  currentIndex,
  onPick
}: {
  questions: { answer: string; flagged: boolean }[];
  currentIndex: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="card p-3">
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const answered = q.answer.trim().length > 0;
          const isCurrent = i === currentIndex;
          let cls = 'flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-colors ';
          if (isCurrent) {
            cls += 'bg-ink-900 text-white ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:bg-accent-500 dark:ring-offset-ink-900';
          } else if (q.flagged) {
            cls += 'bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/40';
          } else if (answered) {
            cls += 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/40';
          } else {
            cls += 'bg-ink-100 text-ink-600 ring-1 ring-ink-200 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:ring-ink-700 dark:hover:bg-ink-700';
          }
          return (
            <button key={i} onClick={() => onPick(i)} className={cls} aria-label={`Question ${i + 1}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-ink-500 dark:text-ink-400">
        <Legend dot="bg-emerald-300" label="answered" />
        <Legend dot="bg-amber-300" label="flagged" />
        <Legend dot="bg-ink-300 dark:bg-ink-600" label="empty" />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function ConfirmModal({
  unanswered,
  onConfirm,
  onCancel
}: {
  unanswered: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-5">
        <div className="text-base font-semibold text-ink-900 dark:text-ink-50">Submit interview?</div>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
          {unanswered === 0
            ? 'All questions answered. Ready to grade?'
            : `${unanswered} question${unanswered === 1 ? '' : 's'} still empty — they'll score 0.`}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">
            Keep going
          </button>
          <button onClick={onConfirm} className="btn-primary">
            Submit & grade
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmittingOverlay({ state }: { state: { questions: { feedback: unknown; feedbackPending: boolean }[] } }) {
  const total = state.questions.filter((q) => !!q).length;
  const done = state.questions.filter((q) => q.feedback != null).length;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-ink-200 border-t-accent-500 dark:border-ink-700" />
        <div className="text-base font-semibold text-ink-900 dark:text-ink-50">
          Grading your interview
        </div>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
          {done} of {total} graded · this usually takes ~10 seconds.
        </p>
      </div>
    </div>
  );
}

function ChipRow({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { id: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={
              value === o.id
                ? 'rounded-full bg-ink-900 px-3 py-1 text-xs font-medium text-white shadow-sm dark:bg-accent-500'
                : 'rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800'
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
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

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
