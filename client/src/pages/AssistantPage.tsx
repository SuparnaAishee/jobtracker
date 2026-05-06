import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import * as assistant from '../api/assistant';
import { HttpError } from '../api/client';

export function AssistantPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [tone, setTone] = useState('professional, warm, concise');

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<assistant.AnalyzeJdResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [drafting, setDrafting] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [letterError, setLetterError] = useState<string | null>(null);

  useEffect(() => {
    assistant.status().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false));
  }, []);

  const runAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysis(null);
    try {
      const res = await assistant.analyze({ jobDescription, resume: resume || null });
      setAnalysis(res);
    } catch (err) {
      setAnalyzeError(formatErr(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const runLetter = async () => {
    setDrafting(true);
    setLetterError(null);
    setLetter(null);
    try {
      const res = await assistant.coverLetter({
        jobDescription,
        resume,
        companyName,
        position,
        tone
      });
      setLetter(res.coverLetter);
    } catch (err) {
      setLetterError(formatErr(err));
    } finally {
      setDrafting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
          AI assistant
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
          Tailor every application
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
          Paste a job description, get a fit score, missing-keyword list, and a draft cover letter — grounded in your resume.
        </p>
      </div>

      {configured === false && (
        <div className="card mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          The AI assistant is not configured. Set the <code className="font-mono">GEMINI_API_KEY</code> env var on the server (free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com/apikey</a>).
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-50">Inputs</h2>
          <div className="space-y-4">
            <Field label="Job description">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={9}
                placeholder="Paste the full job description here…"
                className="input resize-y font-mono text-xs"
              />
            </Field>
            <Field label="Your resume (text)">
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                rows={7}
                placeholder="Paste your resume as plain text. The assistant uses this to ground its analysis."
                className="input resize-y font-mono text-xs"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company">
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input" placeholder="Stripe" />
              </Field>
              <Field label="Position">
                <input value={position} onChange={(e) => setPosition(e.target.value)} className="input" placeholder="Senior Backend Engineer" />
              </Field>
              <Field label="Tone (cover letter)" className="sm:col-span-2">
                <input value={tone} onChange={(e) => setTone(e.target.value)} className="input" />
              </Field>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={runAnalyze}
                disabled={analyzing || !configured || !jobDescription.trim()}
                className="btn-primary"
              >
                {analyzing ? 'Analyzing…' : 'Analyze fit'}
              </button>
              <button
                onClick={runLetter}
                disabled={drafting || !configured || !jobDescription.trim() || !resume.trim() || !companyName.trim() || !position.trim()}
                className="btn-ghost"
              >
                {drafting ? 'Drafting…' : 'Draft cover letter'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-50">Fit analysis</h2>
            {analyzeError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {analyzeError}
              </div>
            )}
            {!analysis && !analyzeError && (
              <p className="text-sm text-ink-500 dark:text-ink-500">Run an analysis to see a fit score, strengths, and gaps.</p>
            )}
            {analysis && <AnalysisView a={analysis} />}
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-50">Cover letter draft</h2>
            {letterError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {letterError}
              </div>
            )}
            {!letter && !letterError && (
              <p className="text-sm text-ink-500 dark:text-ink-500">
                Fill in company, position, JD, and resume — then click <b>Draft cover letter</b>.
              </p>
            )}
            {letter && (
              <div>
                <pre className="whitespace-pre-wrap rounded-md bg-ink-50 p-4 text-sm text-ink-800 dark:bg-ink-950 dark:text-ink-200">
                  {letter}
                </pre>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => navigator.clipboard.writeText(letter)}
                    className="btn-ghost"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function AnalysisView({ a }: { a: assistant.AnalyzeJdResponse }) {
  const tone =
    a.fitScore >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : a.fitScore >= 60
      ? 'text-violet-600 dark:text-violet-400'
      : a.fitScore >= 40
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';
  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className={`text-5xl font-semibold tabular-nums ${tone}`}>{a.fitScore}</span>
        <span className="text-sm text-ink-500 dark:text-ink-400">fit score / 100</span>
      </div>
      <p className="text-sm text-ink-700 dark:text-ink-300">{a.summary}</p>
      <Section title="Strengths" items={a.strengths} dot="bg-emerald-500" />
      <Section title="Gaps" items={a.gaps} dot="bg-rose-500" />
      <KeywordCloud keywords={a.suggestedKeywords} />
    </div>
  );
}

function Section({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
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

function KeywordCloud({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        Suggested keywords
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((k, i) => (
          <span
            key={i}
            className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-800 ring-1 ring-inset ring-accent-200 dark:bg-accent-500/10 dark:text-accent-200 dark:ring-accent-500/30"
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = ''
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function formatErr(err: unknown): string {
  if (err instanceof HttpError) return err.body?.detail ?? err.body?.title ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Request failed.';
}
