import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import * as assistant from '../api/assistant';
import { HttpError } from '../api/client';

interface QuestionState {
  q: assistant.InterviewQuestionItem;
  answer: string;
  grading: boolean;
  feedback: assistant.GradeAnswerResponse | null;
  error: string | null;
  showModel: boolean;
}

export function PrepPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');
  const [role, setRole] = useState('');
  const [count, setCount] = useState(8);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionState[]>([]);

  useEffect(() => {
    assistant.status().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setQuestions([]);
    try {
      const res = await assistant.interviewQuestions({
        jobDescription,
        resume: resume || null,
        role: role || null,
        count
      });
      setQuestions(
        res.questions.map((q) => ({ q, answer: '', grading: false, feedback: null, error: null, showModel: false }))
      );
    } catch (err) {
      setGenError(formatErr(err));
    } finally {
      setGenerating(false);
    }
  };

  const updateQ = (i: number, patch: Partial<QuestionState>) =>
    setQuestions((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const handleGrade = async (i: number) => {
    const state = questions[i];
    if (!state.answer.trim()) return;
    updateQ(i, { grading: true, error: null, feedback: null, showModel: false });
    try {
      const res = await assistant.gradeAnswer({
        question: state.q.question,
        userAnswer: state.answer,
        jobDescription: jobDescription || null,
        resume: resume || null
      });
      updateQ(i, { feedback: res, grading: false });
    } catch (err) {
      updateQ(i, { error: formatErr(err), grading: false });
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
          Interview prep
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
          Practice with an AI interviewer
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
          Paste a JD → get questions tailored to that role → answer them → get a graded breakdown with a model answer.
        </p>
      </div>

      {configured === false && (
        <div className="card mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          The AI assistant is not configured. Set <code className="font-mono">GEMINI_API_KEY</code> in <code className="font-mono">.env</code> and restart.
        </div>
      )}

      <div className="card mb-8 p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-50">Job context</h2>
        <div className="space-y-4">
          <Field label="Job description" required>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              placeholder="Paste the JD you're interviewing for…"
              className="input resize-y font-mono text-xs"
            />
          </Field>
          <Field label="Your resume (optional, improves question targeting)">
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={4}
              placeholder="Paste your resume as plain text."
              className="input resize-y font-mono text-xs"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role hint (optional)">
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="input"
              />
            </Field>
            <Field label="Number of questions">
              <input
                type="number"
                min={3}
                max={15}
                value={count}
                onChange={(e) => setCount(Math.max(3, Math.min(15, Number(e.target.value) || 8)))}
                className="input"
              />
            </Field>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !configured || !jobDescription.trim()}
              className="btn-primary"
            >
              {generating ? 'Generating…' : 'Generate questions'}
            </button>
          </div>
          {genError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {genError}
            </div>
          )}
        </div>
      </div>

      {questions.length === 0 && !generating && (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.5 9.5a2.5 2.5 0 1 1 4.5 1.5c-.7.7-1.5 1.2-1.5 2v1M12 17h.01" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div className="text-ink-700 dark:text-ink-200">No questions yet.</div>
          <div className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Paste a JD above and click <b className="font-medium text-ink-900 dark:text-ink-100">Generate questions</b>.
          </div>
        </div>
      )}

      <div className="space-y-5">
        {questions.map((s, i) => (
          <QuestionCard
            key={i}
            index={i}
            state={s}
            onAnswerChange={(v) => updateQ(i, { answer: v })}
            onGrade={() => handleGrade(i)}
            onToggleModel={() => updateQ(i, { showModel: !s.showModel })}
          />
        ))}
      </div>
    </Layout>
  );
}

function QuestionCard({
  index,
  state,
  onAnswerChange,
  onGrade,
  onToggleModel
}: {
  index: number;
  state: QuestionState;
  onAnswerChange: (v: string) => void;
  onGrade: () => void;
  onToggleModel: () => void;
}) {
  const { q, answer, grading, feedback, error, showModel } = state;
  return (
    <div className="card p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-ink-400">#{String(index + 1).padStart(2, '0')}</span>
        <CategoryBadge label={q.category} />
        <DifficultyBadge label={q.difficulty} />
      </div>
      <p className="text-base font-medium leading-relaxed text-ink-900 dark:text-ink-50">{q.question}</p>
      <p className="mt-1 text-xs italic text-ink-500 dark:text-ink-400">Why they ask: {q.whyAsked}</p>

      <div className="mt-4">
        <label className="label">Your answer</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={5}
          placeholder="Speak (well, type) it out. Use STAR for behavioral, walk through your reasoning for technical."
          className="input resize-y"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-ink-500 dark:text-ink-500">{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
        <button
          onClick={onGrade}
          disabled={grading || !answer.trim()}
          className="btn-primary"
        >
          {grading ? 'Grading…' : 'Get feedback'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {feedback && (
        <div className="mt-5 border-t border-ink-100 pt-5 dark:border-ink-800">
          <div className="mb-4 flex items-baseline gap-3">
            <span className={`text-4xl font-semibold tabular-nums ${scoreColor(feedback.score)}`}>{feedback.score}</span>
            <span className="text-sm text-ink-500 dark:text-ink-400">/ 100</span>
          </div>
          <Section title="Strengths" items={feedback.strengths} dot="bg-emerald-500" />
          <Section title="Improvements" items={feedback.improvements} dot="bg-rose-500" />

          <div className="mt-4">
            <button
              onClick={onToggleModel}
              className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
            >
              {showModel ? 'Hide model answer' : 'Show model answer'}
            </button>
            {showModel && (
              <div className="mt-2 rounded-md bg-ink-50 p-4 text-sm leading-relaxed text-ink-800 dark:bg-ink-950 dark:text-ink-200">
                {feedback.modelAnswer}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">{title}</div>
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

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="ml-0.5 text-accent-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-violet-600 dark:text-violet-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function formatErr(err: unknown): string {
  if (err instanceof HttpError) return err.body?.detail ?? err.body?.title ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Request failed.';
}
