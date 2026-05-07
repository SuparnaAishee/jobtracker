import { useState } from 'react';
import { ReviewScreen } from '../ReviewScreen';
import type { QuestionState, RunningProps, SessionMode, SetupExtrasProps } from '../types';

export const practiceMode: SessionMode = {
  id: 'practice',
  label: 'Practice',
  tagline: 'Untimed. Read the answer whenever you want.',
  bullets: [
    'See all questions at once',
    'Reveal the model answer on demand',
    'Grade individual answers as you go',
    'No clock, no pressure'
  ],
  defaults: {
    lockModelAnswers: false,
    totalTimeSec: undefined,
    perQuestionSoftLimitSec: undefined
  },
  SetupExtras: PracticeSetupExtras,
  Running: PracticeRunning,
  Review: ReviewScreen
};

function PracticeSetupExtras(_: SetupExtrasProps) {
  return (
    <p className="text-sm text-ink-600 dark:text-ink-400">
      Practice mode has no extra options. After you start, every question will be visible — answer them in any order, peek at the model answer whenever, and grade only the ones you want feedback on.
    </p>
  );
}

function PracticeRunning({ state, setQuestion, gradeOne, finishWithoutSubmit }: RunningProps) {
  const graded = state.questions.filter((q) => q.feedback != null).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
            Practice
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
            {state.questions.length} questions · {graded} graded
          </h1>
        </div>
        <button onClick={finishWithoutSubmit} className="btn-ghost">
          Wrap up & see summary
        </button>
      </div>

      <div className="space-y-4">
        {state.questions.map((qs, i) => (
          <PracticeCard
            key={i}
            index={i}
            qs={qs}
            onAnswer={(v) => setQuestion(i, { answer: v })}
            onGrade={() => gradeOne(i)}
            onToggleModel={() => setQuestion(i, { showModelAnswer: !qs.showModelAnswer })}
            onToggleFlag={() => setQuestion(i, { flagged: !qs.flagged })}
          />
        ))}
      </div>
    </div>
  );
}

function PracticeCard({
  index,
  qs,
  onAnswer,
  onGrade,
  onToggleModel,
  onToggleFlag
}: {
  index: number;
  qs: QuestionState;
  onAnswer: (v: string) => void;
  onGrade: () => void;
  onToggleModel: () => void;
  onToggleFlag: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`card p-5 ${qs.flagged ? 'ring-1 ring-amber-300 dark:ring-amber-500/40' : ''}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-400">#{String(index + 1).padStart(2, '0')}</span>
        <CategoryBadge label={qs.q.category} />
        <DifficultyBadge label={qs.q.difficulty} />
        <button
          onClick={onToggleFlag}
          className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors ${
            qs.flagged
              ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30'
              : 'text-ink-500 ring-ink-200 hover:bg-ink-50 dark:text-ink-400 dark:ring-ink-800 dark:hover:bg-ink-800/40'
          }`}
        >
          {qs.flagged ? '★ Flagged' : '☆ Flag'}
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-full px-2 py-0.5 text-xs font-medium text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 dark:text-ink-400 dark:ring-ink-800 dark:hover:bg-ink-800/40"
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <p className="text-base font-medium leading-relaxed text-ink-900 dark:text-ink-50">{qs.q.question}</p>
      <p className="mt-1 text-xs italic text-ink-500 dark:text-ink-400">Why they ask: {qs.q.whyAsked}</p>

      {open && (
        <>
          <div className="mt-4">
            <span className="label">Your answer</span>
            <textarea
              value={qs.answer}
              onChange={(e) => onAnswer(e.target.value)}
              rows={5}
              placeholder="Type it out. Use STAR for behavioral; walk through your reasoning for technical."
              className="input resize-y"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-ink-500 dark:text-ink-500">
              {wordCount(qs.answer)} words
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleModel}
                className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400"
              >
                {qs.showModelAnswer ? 'Hide model answer' : 'Show model answer'}
              </button>
              <button
                onClick={onGrade}
                disabled={qs.feedbackPending || !qs.answer.trim()}
                className="btn-primary"
              >
                {qs.feedbackPending ? 'Grading…' : qs.feedback ? 'Re-grade' : 'Grade me'}
              </button>
            </div>
          </div>

          {qs.feedbackError && (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {qs.feedbackError}
            </div>
          )}

          {qs.feedback && (
            <div className="mt-4 border-t border-ink-100 pt-4 dark:border-ink-800">
              <div className="mb-3 flex items-baseline gap-3">
                <span className={`text-3xl font-semibold tabular-nums ${scoreTone(qs.feedback.score)}`}>
                  {qs.feedback.score}
                </span>
                <span className="text-sm text-ink-500 dark:text-ink-400">/ 100</span>
              </div>
              <Section title="Strengths" items={qs.feedback.strengths} dot="bg-emerald-500" />
              <Section title="Improvements" items={qs.feedback.improvements} dot="bg-rose-500" />
            </div>
          )}

          {qs.showModelAnswer && (
            <div className="mt-3 rounded-md bg-ink-50 p-4 text-sm leading-relaxed text-ink-800 dark:bg-ink-950 dark:text-ink-200">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
                Model answer
              </div>
              {qs.feedback?.modelAnswer ?? (
                <span className="italic text-ink-500 dark:text-ink-400">
                  Grade this answer to fetch a model answer.
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {title}
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span className="text-ink-700 dark:text-ink-300">{it}</span>
          </li>
        ))}
      </ul>
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

function scoreTone(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-violet-600 dark:text-violet-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
