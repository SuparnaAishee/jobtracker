import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import * as assistant from '../api/assistant';
import { HttpError } from '../api/client';
import { SetupScreen } from '../prep/SetupScreen';
import { getMode } from '../prep/modes';
import { clearSession, loadSession, saveSession } from '../prep/storage';
import {
  newQuestionState,
  type Category,
  type Difficulty,
  type QuestionState,
  type SessionConfig,
  type SessionState
} from '../prep/types';

export function PrepPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [resumeBanner, setResumeBanner] = useState<SessionState | null>(null);

  useEffect(() => {
    assistant
      .status()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false));

    const saved = loadSession();
    if (saved && saved.phase !== 'review') {
      setResumeBanner(saved);
    } else if (saved && saved.phase === 'review') {
      setState(saved);
    }
  }, []);

  const persist = (next: SessionState | null) => {
    setState(next);
    if (next) saveSession(next);
    else clearSession();
  };

  const updateState = (patch: Partial<SessionState>) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveSession(next);
      return next;
    });
  };

  const updateQuestion = (index: number, patch: Partial<QuestionState>) => {
    setState((prev) => {
      if (!prev) return prev;
      const next: SessionState = {
        ...prev,
        questions: prev.questions.map((q, i) => (i === index ? { ...q, ...patch } : q))
      };
      saveSession(next);
      return next;
    });
  };

  const handleStart = async (config: SessionConfig) => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await assistant.interviewQuestions({
        jobDescription: config.jobDescription,
        resume: config.resume || null,
        role: config.role || null,
        count: config.count
      });
      const filtered = applyFilters(res.questions, config.categoryFilter, config.difficultyFilter);
      if (filtered.length === 0) {
        setGenerateError(
          'No questions matched your filters. Loosen the categories/difficulty and try again.'
        );
        return;
      }
      const session: SessionState = {
        id: cryptoRandomId(),
        config,
        phase: 'running',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        questions: filtered.map(newQuestionState),
        currentIndex: 0,
        remainingSec: config.totalTimeSec ?? null
      };
      persist(session);
    } catch (err) {
      setGenerateError(formatErr(err));
    } finally {
      setGenerating(false);
    }
  };

  const gradeOne = async (index: number) => {
    if (!state) return;
    const qs = state.questions[index];
    if (!qs.answer.trim()) return;
    updateQuestion(index, { feedbackPending: true, feedbackError: null });
    try {
      const res = await assistant.gradeAnswer({
        question: qs.q.question,
        userAnswer: qs.answer,
        jobDescription: state.config.jobDescription || null,
        resume: state.config.resume || null
      });
      updateQuestion(index, { feedback: res, feedbackPending: false });
    } catch (err) {
      updateQuestion(index, { feedbackError: formatErr(err), feedbackPending: false });
    }
  };

  const submitAll = async () => {
    if (!state) return;
    const snapshot = state;
    updateState({ phase: 'submitting' });

    const results = await Promise.allSettled(
      snapshot.questions.map(async (qs) => {
        if (!qs.answer.trim()) {
          return {
            score: 0,
            strengths: [],
            improvements: ['No answer submitted.'],
            modelAnswer: ''
          } satisfies assistant.GradeAnswerResponse;
        }
        return assistant.gradeAnswer({
          question: qs.q.question,
          userAnswer: qs.answer,
          jobDescription: snapshot.config.jobDescription || null,
          resume: snapshot.config.resume || null
        });
      })
    );

    setState((prev) => {
      if (!prev) return prev;
      const updatedQuestions = prev.questions.map((qs, i) => {
        const r = results[i];
        if (r.status === 'fulfilled') {
          return { ...qs, feedback: r.value, feedbackPending: false, feedbackError: null };
        }
        return {
          ...qs,
          feedbackPending: false,
          feedbackError: formatErr(r.reason)
        };
      });
      const next: SessionState = {
        ...prev,
        phase: 'review',
        finishedAt: new Date().toISOString(),
        questions: updatedQuestions,
        remainingSec: 0
      };
      saveSession(next);
      return next;
    });
  };

  const finishWithoutSubmit = () => {
    if (!state) return;
    updateState({ phase: 'review', finishedAt: new Date().toISOString() });
  };

  const startNewSession = () => persist(null);

  const retryWeak = () => {
    if (!state) return;
    const weak = state.questions.filter((q) => (q.feedback?.score ?? 0) < 60);
    if (weak.length === 0) return;
    const session: SessionState = {
      id: cryptoRandomId(),
      config: state.config,
      phase: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      questions: weak.map((q) => newQuestionState(q.q)),
      currentIndex: 0,
      remainingSec: state.config.totalTimeSec ?? null
    };
    persist(session);
  };

  const acceptResume = () => {
    if (!resumeBanner) return;
    setState(resumeBanner);
    setResumeBanner(null);
  };

  const discardResume = () => {
    clearSession();
    setResumeBanner(null);
  };

  const phase = state?.phase ?? 'setup';
  const mode = state ? getMode(state.config.modeId) : null;

  return (
    <Layout>
      {resumeBanner && (
        <ResumeBanner state={resumeBanner} onResume={acceptResume} onDiscard={discardResume} />
      )}

      {!state && (
        <>
          <Hero />
          {configured === false && <ConfigureBanner />}
          <SetupScreen
            generating={generating}
            generateError={generateError}
            configured={configured}
            onStart={handleStart}
          />
        </>
      )}

      {state && phase === 'review' && mode && (
        <mode.Review state={state} startNewSession={startNewSession} retryWeak={retryWeak} />
      )}

      {state && (phase === 'running' || phase === 'submitting') && mode && (
        <mode.Running
          state={state}
          setQuestion={updateQuestion}
          setCurrentIndex={(i) => updateState({ currentIndex: i })}
          setRemaining={(sec) => updateState({ remainingSec: sec })}
          gradeOne={gradeOne}
          submitAll={submitAll}
          finishWithoutSubmit={finishWithoutSubmit}
        />
      )}
    </Layout>
  );
}

function Hero() {
  return (
    <div className="mb-8">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
        Interview prep
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
        Practice or simulate the real thing
      </h1>
      <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
        Pick a mode, paste the JD, generate a tailored set of questions, and either learn at your pace or run the full timed simulation.
      </p>
    </div>
  );
}

function ConfigureBanner() {
  return (
    <div className="card mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      The AI assistant is not configured. Set <code className="font-mono">GEMINI_API_KEY</code> in <code className="font-mono">.env</code> and restart.
    </div>
  );
}

function ResumeBanner({
  state,
  onResume,
  onDiscard
}: {
  state: SessionState;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const mode = getMode(state.config.modeId);
  return (
    <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-accent-200 bg-accent-50/60 p-4 dark:border-accent-500/30 dark:bg-accent-500/10">
      <div>
        <div className="text-sm font-semibold text-accent-900 dark:text-accent-100">
          Resume your in-progress {mode.label.toLowerCase()}?
        </div>
        <div className="mt-0.5 text-xs text-accent-800/90 dark:text-accent-200/90">
          {state.questions.length} questions · started {timeAgo(state.startedAt)}
          {state.remainingSec != null && ` · ${formatSeconds(state.remainingSec)} remaining`}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onDiscard} className="btn-ghost">
          Discard
        </button>
        <button onClick={onResume} className="btn-primary">
          Resume
        </button>
      </div>
    </div>
  );
}

function applyFilters(
  qs: assistant.InterviewQuestionItem[],
  cats: Category[],
  diffs: Difficulty[]
): assistant.InterviewQuestionItem[] {
  return qs.filter((q) => {
    if (cats.length > 0 && !cats.includes(q.category as Category)) return false;
    if (diffs.length > 0 && !diffs.includes(q.difficulty as Difficulty)) return false;
    return true;
  });
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} d ago`;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function formatErr(err: unknown): string {
  if (err instanceof HttpError) return err.body?.detail ?? err.body?.title ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Request failed.';
}
