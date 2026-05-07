import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Layout } from '../components/Layout';
import { ApplicationContextPicker } from '../components/ApplicationContextPicker';
import { AssistantOnboardingBanner } from '../components/AssistantOnboardingBanner';
import { JdField } from '../components/JdField';
import { ResumePickerField } from '../components/ResumePickerField';
import * as assistant from '../api/assistant';
import * as resumes from '../api/resumes';
import * as jobApps from '../api/jobApplications';
import { HttpError } from '../api/client';
import type { JobApplication } from '../types';

type Tab = 'fit' | 'tailor' | 'cover';

const TONE_PRESETS = [
  { id: 'professional', label: 'Professional', value: 'professional, warm, concise' },
  { id: 'warm', label: 'Warm', value: 'warm, personable, sincere' },
  { id: 'bold', label: 'Bold', value: 'confident, bold, results-oriented' },
  { id: 'casual', label: 'Casual', value: 'casual, conversational, friendly' },
  { id: 'enthusiastic', label: 'Enthusiastic', value: 'enthusiastic, energetic, excited' }
] as const;

const LENGTH_OPTIONS = [
  { id: 'short', label: 'Short', words: 200 },
  { id: 'standard', label: 'Standard', words: 300 },
  { id: 'long', label: 'Long', words: 450 }
] as const;

const QUICK_FEEDBACK = [
  'Make it shorter',
  'More enthusiastic',
  'Less corporate',
  'More specific to the role',
  'Stronger opener'
];

const QUICK_TAILOR = [
  'More concise',
  'Stronger metrics',
  'Lead with the most relevant role',
  'Drop the summary section',
  'Match keywords harder'
];

const ANALYZE_STAGES = [
  'Reading the job description…',
  'Comparing against your resume…',
  'Scoring fit…',
  'Drafting insights…'
];

const TAB_META: Record<Tab, { label: string; helper: string; cta: string }> = {
  fit: { label: 'Fit analysis', helper: 'Score this JD against your resume.', cta: 'Analyze fit' },
  tailor: { label: 'Tailored resume', helper: 'Rewrite your resume for this JD.', cta: 'Tailor my resume' },
  cover: { label: 'Cover letter', helper: 'Draft & refine a cover letter.', cta: 'Draft cover letter' }
};

export function AssistantPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('fit');

  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');

  const [tonePresetId, setTonePresetId] = useState<string>('professional');
  const [customTone, setCustomTone] = useState('');
  const [lengthId, setLengthId] = useState<string>('standard');

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStageIdx, setAnalyzeStageIdx] = useState(0);
  const [analysis, setAnalysis] = useState<assistant.AnalyzeJdResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [drafting, setDrafting] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [letterFeedback, setLetterFeedback] = useState('');

  const [tailoring, setTailoring] = useState(false);
  const [tailored, setTailored] = useState<assistant.TailorResumeResponse | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailorView, setTailorView] = useState<'edit' | 'preview'>('edit');
  const [tailoredMarkdown, setTailoredMarkdown] = useState<string>('');
  const [tailoredBaseline, setTailoredBaseline] = useState<string>('');
  const [tailorRefining, setTailorRefining] = useState(false);
  const [savingResume, setSavingResume] = useState(false);
  const [saveResumeStatus, setSaveResumeStatus] = useState<string | null>(null);

  const [uploadedResumes, setUploadedResumes] = useState<resumes.Resume[]>([]);

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  useEffect(() => {
    assistant
      .status()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(null));
    resumes.list().then(setUploadedResumes).catch(() => setUploadedResumes([]));
    jobApps
      .list({ pageSize: 50, sortBy: 'updatedAt', sortDescending: true })
      .then((r) => setApplications(r.items))
      .catch(() => setApplications([]));
  }, []);

  useEffect(() => {
    if (!analyzing) {
      setAnalyzeStageIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setAnalyzeStageIdx((i) => Math.min(i + 1, ANALYZE_STAGES.length - 1));
    }, 1400);
    return () => window.clearInterval(id);
  }, [analyzing]);

  const effectiveTone = useMemo(() => {
    if (tonePresetId === 'custom') return customTone.trim() || 'professional, warm, concise';
    return TONE_PRESETS.find((t) => t.id === tonePresetId)?.value ?? 'professional, warm, concise';
  }, [tonePresetId, customTone]);

  const lengthOpt = LENGTH_OPTIONS.find((l) => l.id === lengthId) ?? LENGTH_OPTIONS[1];

  const analyzeMissing = !jobDescription.trim() ? ['job description'] : [];
  const letterMissing = [
    !jobDescription.trim() && 'job description',
    !resume.trim() && 'resume',
    !companyName.trim() && 'company',
    !position.trim() && 'position'
  ].filter(Boolean) as string[];
  const tailorMissing = [
    !jobDescription.trim() && 'job description',
    !resume.trim() && 'resume'
  ].filter(Boolean) as string[];

  const pickApplication = (id: string) => {
    setSelectedAppId(id);
    if (!id) return;
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    setCompanyName(app.companyName);
    setPosition(app.position);
  };

  const runAnalyze = async () => {
    if (analyzeMissing.length > 0 || configured === false) return;
    setActiveTab('fit');
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

  const runTailor = async () => {
    if (tailorMissing.length > 0 || configured === false) return;
    setActiveTab('tailor');
    setTailoring(true);
    setTailorError(null);
    setTailored(null);
    setTailoredMarkdown('');
    setTailoredBaseline('');
    setSaveResumeStatus(null);
    try {
      const res = await assistant.tailorResume({ resume, jobDescription });
      setTailored(res);
      setTailoredMarkdown(res.tailoredResume);
      setTailoredBaseline(res.tailoredResume);
    } catch (err) {
      setTailorError(formatErr(err));
    } finally {
      setTailoring(false);
    }
  };

  const runTailorRefine = async (instructions: string) => {
    if (!tailoredMarkdown.trim() || configured === false) return;
    setTailorRefining(true);
    setTailorError(null);
    setSaveResumeStatus(null);
    try {
      const res = await assistant.tailorResume({
        resume: tailoredMarkdown,
        jobDescription,
        instructions
      });
      setTailored(res);
      setTailoredMarkdown(res.tailoredResume);
      setTailoredBaseline(res.tailoredResume);
    } catch (err) {
      setTailorError(formatErr(err));
    } finally {
      setTailorRefining(false);
    }
  };

  const saveAsResume = async (label: string) => {
    if (!tailoredMarkdown.trim()) return;
    setSavingResume(true);
    setSaveResumeStatus(null);
    try {
      const safe = label.trim() || 'Tailored resume';
      const fileName = `${safe.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '')}.md`;
      const file = new File([tailoredMarkdown], fileName, { type: 'text/markdown' });
      const created = await resumes.upload(file, safe);
      setUploadedResumes((prev) => [created, ...prev]);
      setSaveResumeStatus(`Saved as "${safe}". It's in the resume picker now.`);
    } catch (err) {
      setSaveResumeStatus(`Save failed: ${formatErr(err)}`);
    } finally {
      setSavingResume(false);
    }
  };

  const downloadTailored = () => {
    if (!tailoredMarkdown) return;
    const blob = new Blob([tailoredMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored-resume.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildToneWithFeedback = (base: string, feedback: string | null) => {
    const lengthHint = `target ${lengthOpt.words} words`;
    const parts = [base, lengthHint, feedback?.trim()].filter(Boolean);
    return parts.join('; ');
  };

  const runLetter = async (feedback: string | null = null) => {
    if (letterMissing.length > 0 || configured === false) return;
    setActiveTab('cover');
    setDrafting(true);
    setLetterError(null);
    if (!feedback) setLetter(null);
    try {
      const res = await assistant.coverLetter({
        jobDescription,
        resume,
        companyName,
        position,
        tone: buildToneWithFeedback(effectiveTone, feedback)
      });
      setLetter(res.coverLetter);
      setLetterFeedback('');
    } catch (err) {
      setLetterError(formatErr(err));
    } finally {
      setDrafting(false);
    }
  };

  const runActiveTab = () => {
    if (activeTab === 'fit') runAnalyze();
    else if (activeTab === 'tailor') runTailor();
    else runLetter(null);
  };

  // Ctrl/Cmd+Enter runs whichever tab is active.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runActiveTab();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, jobDescription, resume, companyName, position, configured, effectiveTone, lengthId]);

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            AI assistant
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[2rem]">
            Tailor every application
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-600 dark:text-ink-400">
            Score the fit, rewrite your resume, and draft a cover letter — every output grounded in your real experience.
          </p>
        </div>
      </div>

      <div className="mb-5">
        <ApplicationContextPicker
          applications={applications}
          selectedId={selectedAppId}
          onPick={pickApplication}
          onClear={() => {
            setSelectedAppId('');
            setCompanyName('');
            setPosition('');
          }}
        />
      </div>

      <AssistantOnboardingBanner hasResumes={uploadedResumes.length > 0} />

      {configured === false && (
        <div className="card mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          The AI assistant is not configured on the server. Set <code className="font-mono">GEMINI_API_KEY</code> in <code className="font-mono">.env</code> and restart (free key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com/apikey</a>).
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Inputs — sticky on desktop */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5 dark:border-ink-800">
              <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">
                Your inputs
              </h2>
              <span className="hidden text-[10px] font-medium uppercase tracking-wider text-ink-400 dark:text-ink-500 sm:block">
                Step 1
              </span>
            </div>
            <div className="divide-y divide-ink-200/70 dark:divide-ink-800/70">
              {/* Section 1 — role context */}
              <div className="space-y-3 p-5">
                <SectionLabel index="1" title="Role" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Company">
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="input"
                      placeholder="Stripe"
                    />
                  </Field>
                  <Field label="Position">
                    <input
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="input"
                      placeholder="Senior Backend Engineer"
                    />
                  </Field>
                </div>
              </div>

              {/* Section 2 — job description */}
              <div className="space-y-2 p-5">
                <SectionLabel
                  index="2"
                  title="Job description"
                  hint={jobDescription ? `${jobDescription.length.toLocaleString()} chars` : undefined}
                />
                <JdField
                  value={jobDescription}
                  onChange={setJobDescription}
                  showLabel={false}
                />
              </div>

              {/* Section 3 — resume */}
              <div className="space-y-2 p-5">
                <SectionLabel index="3" title="Your resume" />
                <ResumePickerField
                  value={resume}
                  onChange={setResume}
                  uploadedResumes={uploadedResumes}
                  setUploadedResumes={setUploadedResumes}
                  showLabel={false}
                />
              </div>
            </div>
            <ActiveTabRunFooter
              activeTab={activeTab}
              missing={
                activeTab === 'fit' ? analyzeMissing
                : activeTab === 'tailor' ? tailorMissing
                : letterMissing
              }
              busy={
                activeTab === 'fit' ? analyzing
                : activeTab === 'tailor' ? (tailoring || tailorRefining)
                : drafting
              }
              configured={configured}
              onRun={runActiveTab}
            />
          </div>
        </div>

        {/* Output canvas — tabs */}
        <div className="card overflow-hidden">
          <div className="flex bg-ink-50/60 dark:bg-ink-950/40">
            {(Object.keys(TAB_META) as Tab[]).map((t) => (
              <TabButton
                key={t}
                active={activeTab === t}
                onClick={() => setActiveTab(t)}
                icon={t}
                badge={
                  t === 'fit' && analysis ? `${analysis.fitScore}` :
                  t === 'tailor' && tailored ? '✓' :
                  t === 'cover' && letter ? '✓' : null
                }
              >
                {TAB_META[t].label}
              </TabButton>
            ))}
          </div>

          <div className="p-6 min-h-[480px]">
            {activeTab === 'fit' && (
              <FitTab
                analyzing={analyzing}
                stage={ANALYZE_STAGES[analyzeStageIdx]}
                analysis={analysis}
                error={analyzeError}
                missing={analyzeMissing}
                disabled={configured === false}
                onRun={runAnalyze}
              />
            )}
            {activeTab === 'tailor' && (
              <TailorTab
                tailoring={tailoring}
                refining={tailorRefining}
                tailored={tailored}
                markdown={tailoredMarkdown}
                baseline={tailoredBaseline}
                onMarkdownChange={setTailoredMarkdown}
                onResetToBaseline={() => setTailoredMarkdown(tailoredBaseline)}
                error={tailorError}
                missing={tailorMissing}
                disabled={configured === false}
                onRetailor={runTailor}
                onRefine={runTailorRefine}
                view={tailorView}
                setView={setTailorView}
                onCopy={() => tailoredMarkdown && navigator.clipboard.writeText(tailoredMarkdown)}
                onDownload={downloadTailored}
                onSaveAsResume={saveAsResume}
                savingResume={savingResume}
                saveStatus={saveResumeStatus}
                companyName={companyName}
                positionName={position}
              />
            )}
            {activeTab === 'cover' && (
              <CoverTab
                drafting={drafting}
                letter={letter}
                error={letterError}
                missing={letterMissing}
                disabled={configured === false}
                tonePresetId={tonePresetId}
                setTonePresetId={setTonePresetId}
                customTone={customTone}
                setCustomTone={setCustomTone}
                lengthId={lengthId}
                setLengthId={setLengthId}
                effectiveTone={effectiveTone}
                feedback={letterFeedback}
                setFeedback={setLetterFeedback}
                onDraft={() => runLetter(null)}
                onRefine={(f) => runLetter(f)}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ─────────────────────────────── tabs ─────────────────────────────── */

function ActiveTabRunFooter({
  activeTab,
  missing,
  busy,
  configured,
  onRun
}: {
  activeTab: Tab;
  missing: string[];
  busy: boolean;
  configured: boolean | null;
  onRun: () => void;
}) {
  const meta = TAB_META[activeTab];
  const blocked = missing.length > 0 || configured === false;
  const label = busy ? 'Working…' : meta.cta;
  return (
    <div className="space-y-2 border-t border-ink-200 px-5 py-4 dark:border-ink-800">
      <button
        onClick={onRun}
        disabled={blocked || busy}
        className="btn-primary w-full justify-center py-2.5 text-sm font-semibold"
      >
        {label}
      </button>
      {missing.length > 0 ? (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-7V6h2v5H9zm0 4v-2h2v2H9z" clipRule="evenodd" />
          </svg>
          Add {missing.join(', ')}
        </div>
      ) : configured === false ? (
        <div className="text-center text-[11px] text-amber-600 dark:text-amber-400">
          AI key not configured on the server
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-500 dark:text-ink-500">
          <kbd className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-ink-800 dark:bg-ink-950">Ctrl</kbd>
          <span>+</span>
          <kbd className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-ink-800 dark:bg-ink-950">Enter</kbd>
          <span className="ml-1">also runs this</span>
        </div>
      )}
    </div>
  );
}

function FitTab({
  analyzing, stage, analysis, error, missing, disabled, onRun
}: {
  analyzing: boolean;
  stage: string;
  analysis: assistant.AnalyzeJdResponse | null;
  error: string | null;
  missing: string[];
  disabled: boolean;
  onRun: () => void;
}) {
  if (analyzing) {
    return (
      <div className="flex h-full flex-col">
        <PanelHeader title="Analyzing your fit" subtitle={stage} />
        <PulsingBars />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PanelHeader title="Fit analysis" />
        <ErrorBox message={error} />
        <RunButton label="Try again" onClick={onRun} missing={missing} disabled={disabled} />
      </div>
    );
  }
  if (!analysis) {
    return (
      <EmptyState
        kind="fit"
        title="Score this JD against your resume"
        body="Get a 0–100 fit score, what you'd shine on, what's missing, and the keywords to surface in your application."
        action={<RunButton label="Analyze fit" onClick={onRun} missing={missing} disabled={disabled} primary large />}
      />
    );
  }
  return (
    <div className="space-y-5">
      <AnalysisView a={analysis} />
      <div className="flex justify-end gap-2 border-t border-ink-200 pt-4 dark:border-ink-800">
        <RunButton label="Re-analyze" onClick={onRun} missing={missing} disabled={disabled} />
      </div>
    </div>
  );
}

function TailorTab({
  tailoring, refining, tailored, markdown, baseline, onMarkdownChange, onResetToBaseline,
  error, missing, disabled,
  onRetailor, onRefine,
  view, setView, onCopy, onDownload,
  onSaveAsResume, savingResume, saveStatus,
  companyName, positionName
}: {
  tailoring: boolean;
  refining: boolean;
  tailored: assistant.TailorResumeResponse | null;
  markdown: string;
  baseline: string;
  onMarkdownChange: (v: string) => void;
  onResetToBaseline: () => void;
  error: string | null;
  missing: string[];
  disabled: boolean;
  onRetailor: () => void;
  onRefine: (instructions: string) => void;
  view: 'edit' | 'preview';
  setView: (v: 'edit' | 'preview') => void;
  onCopy: () => void;
  onDownload: () => void;
  onSaveAsResume: (label: string) => void;
  savingResume: boolean;
  saveStatus: string | null;
  companyName: string;
  positionName: string;
}) {
  const [refineInstr, setRefineInstr] = useState('');
  const [confirmRetailor, setConfirmRetailor] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const edited = markdown !== baseline && baseline.length > 0;
  const busy = tailoring || refining;

  if (tailoring) {
    return (
      <div>
        <PanelHeader title="Tailoring your resume" subtitle="Reordering bullets and surfacing keywords from the JD." />
        <PulsingBars />
      </div>
    );
  }
  if (error && !tailored) {
    return (
      <div>
        <PanelHeader title="Tailored resume" />
        <ErrorBox message={error} />
        <RunButton label="Try again" onClick={onRetailor} missing={missing} disabled={disabled} />
      </div>
    );
  }
  if (!tailored) {
    return (
      <EmptyState
        kind="tailor"
        title="Rewrite your resume for this JD"
        body="Get a first draft from the AI, then edit the markdown directly, refine with quick instructions, and save the result as a new resume in your library."
        action={<RunButton label="Tailor my resume" onClick={onRetailor} missing={missing} disabled={disabled} primary large />}
      />
    );
  }

  const triggerRetailor = () => {
    if (edited) setConfirmRetailor(true);
    else onRetailor();
  };

  const submitRefine = (instr: string) => {
    const trimmed = instr.trim();
    if (!trimmed) return;
    onRefine(trimmed);
    setRefineInstr('');
  };

  return (
    <div className="space-y-4">
      {tailored.changes.length > 0 && <ChangeList changes={tailored.changes} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
            Tailored resume
          </span>
          {edited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Edited
            </span>
          )}
          <span className="text-[10px] text-ink-400 dark:text-ink-500">
            {wordCount(markdown).toLocaleString()} words
          </span>
        </div>
        <div className="flex gap-1 rounded-md border border-ink-200 bg-ink-50 p-0.5 text-xs dark:border-ink-800 dark:bg-ink-950">
          <ViewToggle active={view === 'edit'} onClick={() => setView('edit')}>Edit</ViewToggle>
          <ViewToggle active={view === 'preview'} onClick={() => setView('preview')}>Preview</ViewToggle>
        </div>
      </div>

      {view === 'edit' ? (
        <textarea
          value={markdown}
          onChange={(e) => onMarkdownChange(e.target.value)}
          className="input min-h-[460px] resize-y font-mono text-xs leading-relaxed"
          spellCheck={false}
          disabled={refining}
        />
      ) : (
        <div className="max-h-[460px] overflow-auto rounded-md bg-ink-50 p-5 dark:bg-ink-950">
          {renderMarkdown(markdown)}
        </div>
      )}

      {error && tailored && <ErrorBox message={error} />}

      <div className="rounded-lg border border-dashed border-ink-200 p-3 dark:border-ink-800">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
          Refine with AI
          {refining && (
            <span className="inline-flex items-center gap-1 text-accent-600 dark:text-accent-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
              </span>
              Refining your edits
            </span>
          )}
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_TAILOR.map((t) => (
            <button
              key={t}
              onClick={() => onRefine(t)}
              disabled={busy}
              className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={refineInstr}
            onChange={(e) => setRefineInstr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && refineInstr.trim() && !busy) {
                e.preventDefault();
                submitRefine(refineInstr);
              }
            }}
            placeholder="Or describe a tweak — 'lead with my Postgres work'"
            className="input flex-1"
            disabled={busy}
          />
          <button
            onClick={() => submitRefine(refineInstr)}
            disabled={busy || !refineInstr.trim()}
            className="btn-primary"
          >
            {refining ? 'Refining…' : 'Refine'}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-ink-500 dark:text-ink-500">
          AI builds on your current edits, not the original.
        </p>
      </div>

      {saveStatus && (
        <div className={
          saveStatus.startsWith('Saved')
            ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
        }>
          {saveStatus}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 pt-4 dark:border-ink-800">
        <div className="flex flex-wrap gap-2">
          {edited && (
            <button onClick={onResetToBaseline} disabled={busy} className="btn-ghost">
              Reset to AI output
            </button>
          )}
          <button onClick={onCopy} disabled={busy} className="btn-ghost">Copy</button>
          <button onClick={onDownload} disabled={busy} className="btn-ghost">Download .md</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSaveDialogOpen(true)}
            disabled={busy || savingResume || !markdown.trim()}
            className="btn-ghost"
          >
            {savingResume ? 'Saving…' : 'Save as resume'}
          </button>
          <RunButton label="Re-tailor" onClick={triggerRetailor} missing={missing} disabled={disabled || busy} />
        </div>
      </div>

      {confirmRetailor && (
        <DialogOverlay
          title="Discard your edits and re-tailor from scratch?"
          body="The AI will rewrite from your original resume + JD. Your current markdown changes will be lost. Save a copy first if you want to keep them."
          confirmLabel="Discard & re-tailor"
          confirmTone="rose"
          onConfirm={() => {
            setConfirmRetailor(false);
            onRetailor();
          }}
          onCancel={() => setConfirmRetailor(false)}
        />
      )}

      {saveDialogOpen && (
        <SaveResumeDialog
          defaultLabel={defaultSaveLabel(companyName, positionName)}
          saving={savingResume}
          onSave={(label) => {
            setSaveDialogOpen(false);
            onSaveAsResume(label);
          }}
          onCancel={() => setSaveDialogOpen(false)}
        />
      )}
    </div>
  );
}

function defaultSaveLabel(company: string, position: string): string {
  const c = company.trim();
  const p = position.trim();
  if (c && p) return `Resume — ${c} · ${p}`;
  if (c) return `Resume — ${c}`;
  if (p) return `Resume — ${p}`;
  return 'Tailored resume';
}

function SaveResumeDialog({
  defaultLabel,
  saving,
  onSave,
  onCancel
}: {
  defaultLabel: string;
  saving: boolean;
  onSave: (label: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(defaultLabel);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-5">
        <div className="text-base font-semibold text-ink-900 dark:text-ink-50">Save as new resume</div>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
          Stored as a Markdown file in your resume library, available in the picker on every page.
        </p>
        <div className="mt-3 space-y-1">
          <span className="label">Resume name</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && label.trim()) onSave(label);
              if (e.key === 'Escape') onCancel();
            }}
            className="input"
            autoFocus
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} disabled={saving} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={() => onSave(label)}
            disabled={saving || !label.trim()}
            className="btn-primary"
          >
            {saving ? 'Saving…' : 'Save resume'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DialogOverlay({
  title,
  body,
  confirmLabel,
  confirmTone,
  onConfirm,
  onCancel
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmTone: 'rose' | 'accent';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cls =
    confirmTone === 'rose'
      ? 'inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-150 hover:bg-rose-700'
      : 'btn-primary';
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-5">
        <div className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</div>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button onClick={onConfirm} className={cls}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoverTab({
  drafting, letter, error, missing, disabled,
  tonePresetId, setTonePresetId, customTone, setCustomTone,
  lengthId, setLengthId, effectiveTone,
  feedback, setFeedback,
  onDraft, onRefine
}: {
  drafting: boolean;
  letter: string | null;
  error: string | null;
  missing: string[];
  disabled: boolean;
  tonePresetId: string;
  setTonePresetId: (v: string) => void;
  customTone: string;
  setCustomTone: (v: string) => void;
  lengthId: string;
  setLengthId: (v: string) => void;
  effectiveTone: string;
  feedback: string;
  setFeedback: (v: string) => void;
  onDraft: () => void;
  onRefine: (feedback: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <span className="label">Tone</span>
          <div className="flex flex-wrap gap-2">
            {TONE_PRESETS.map((t) => (
              <Chip key={t.id} selected={tonePresetId === t.id} onClick={() => setTonePresetId(t.id)}>
                {t.label}
              </Chip>
            ))}
            <Chip selected={tonePresetId === 'custom'} onClick={() => setTonePresetId('custom')}>
              Custom…
            </Chip>
          </div>
          {tonePresetId === 'custom' && (
            <input
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
              className="input mt-2"
              placeholder="e.g. confident, technical, with a hint of humor"
            />
          )}
        </div>

        <div>
          <span className="label">Length</span>
          <div className="flex flex-wrap gap-2">
            {LENGTH_OPTIONS.map((l) => (
              <Chip key={l.id} selected={lengthId === l.id} onClick={() => setLengthId(l.id)}>
                {l.label}
                <span className="ml-1 text-[10px] opacity-60">~{l.words}w</span>
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {drafting && !letter && (
        <div>
          <PanelHeader title="Drafting your cover letter" subtitle={`${effectiveTone} · ~${LENGTH_OPTIONS.find((l) => l.id === lengthId)?.words} words`} />
          <PulsingBars />
        </div>
      )}

      {error && <ErrorBox message={error} />}

      {!drafting && !letter && !error && (
        <EmptyState
          kind="cover"
          title="Draft a cover letter"
          body="One click to generate. Then refine without restarting — quick chips like 'shorter' or 'more specific to the role,' or your own instruction."
          action={<RunButton label="Draft cover letter" onClick={onDraft} missing={missing} disabled={disabled} primary large />}
        />
      )}

      {letter && (
        <div className="space-y-3">
          <div className="rounded-md bg-ink-50 p-5 text-sm leading-relaxed text-ink-800 dark:bg-ink-950 dark:text-ink-200">
            {letter.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap">{para}</p>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-ink-500 dark:text-ink-500">
              {wordCount(letter)} words · {effectiveTone}
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(letter)} className="btn-ghost">Copy</button>
              <button onClick={onDraft} disabled={drafting} className="btn-ghost">
                {drafting ? 'Working…' : 'Regenerate'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-ink-200 p-3 dark:border-ink-800">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
              Refine
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_FEEDBACK.map((f) => (
                <button
                  key={f}
                  onClick={() => onRefine(f)}
                  disabled={drafting}
                  className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && feedback.trim() && !drafting) {
                    e.preventDefault();
                    onRefine(feedback.trim());
                  }
                }}
                placeholder="Or describe a tweak — 'lead with my Postgres work'"
                className="input flex-1"
              />
              <button
                onClick={() => feedback.trim() && onRefine(feedback.trim())}
                disabled={drafting || !feedback.trim()}
                className="btn-primary"
              >
                {drafting ? 'Refining…' : 'Refine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── shared sub-components ───────────────────────── */

function TabButton({
  active, onClick, children, badge, icon
}: { active: boolean; onClick: () => void; children: ReactNode; badge?: string | null; icon?: Tab }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'relative flex-1 border-b-2 border-accent-500 bg-white px-4 py-3.5 text-sm font-semibold text-ink-900 dark:bg-ink-900 dark:text-ink-50'
          : 'relative flex-1 border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-ink-500 transition-colors hover:bg-white/40 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-900/40 dark:hover:text-ink-200'
      }
    >
      <span className="inline-flex items-center justify-center gap-2">
        {icon && <TabIcon kind={icon} active={active} />}
        <span>{children}</span>
        {badge && (
          <span className={
            active
              ? 'rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-white'
              : 'rounded-full bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300'
          }>
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

function TabIcon({ kind, active }: { kind: Tab; active: boolean }) {
  const cls = active ? 'text-accent-600 dark:text-accent-400' : 'text-ink-400 dark:text-ink-500';
  if (kind === 'fit') {
    return (
      <svg className={`h-4 w-4 ${cls}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'tailor') {
    return (
      <svg className={`h-4 w-4 ${cls}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3h-7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h4M9 17h6" />
      </svg>
    );
  }
  return (
    <svg className={`h-4 w-4 ${cls}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</div>
      {subtitle && (
        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
          </span>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  kind, title, body, action
}: { kind: Tab; title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex h-full min-h-[380px] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-full bg-accent-500/10 blur-xl dark:bg-accent-500/20" aria-hidden />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/15 to-accent-500/5 ring-1 ring-accent-500/20 text-accent-600 dark:text-accent-400">
          <EmptyStateIcon kind={kind} />
        </div>
      </div>
      <div>
        <div className="text-lg font-semibold text-ink-900 dark:text-ink-50">{title}</div>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-600 dark:text-ink-400">{body}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyStateIcon({ kind }: { kind: Tab }) {
  if (kind === 'fit') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'tailor') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3h-7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h4M9 17h6" />
      </svg>
    );
  }
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function RunButton({
  label, onClick, missing, disabled, primary = false, large = false
}: {
  label: string;
  onClick: () => void;
  missing: string[];
  disabled: boolean;
  primary?: boolean;
  large?: boolean;
}) {
  const blocked = missing.length > 0 || disabled;
  // When blocked we deliberately use a heavily-muted style instead of relying on
  // btn-primary's opacity-60 — the washed-out purple was reading as "this IS the button."
  const enabledCls = primary ? 'btn-primary' : 'btn-ghost';
  const blockedCls = primary
    ? 'inline-flex items-center justify-center gap-2 rounded-md border border-ink-200 bg-ink-100 text-ink-400 cursor-not-allowed dark:border-ink-800 dark:bg-ink-900 dark:text-ink-600'
    : 'inline-flex items-center justify-center gap-2 rounded-md border border-ink-200 bg-white text-ink-300 cursor-not-allowed dark:border-ink-800 dark:bg-ink-900 dark:text-ink-600';
  const sizeCls = large ? 'px-5 py-2.5 text-sm font-semibold' : 'px-4 py-2 text-sm font-medium';
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onClick}
        disabled={blocked}
        className={`${blocked ? blockedCls : enabledCls} ${sizeCls}`}
      >
        {blocked && (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="9" width="12" height="8" rx="1.5" />
            <path d="M7 9V6a3 3 0 016 0v3" />
          </svg>
        )}
        {label}
      </button>
      {missing.length > 0 && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-7V6h2v5H9zm0 4v-2h2v2H9z" clipRule="evenodd" /></svg>
          Add {missing.join(', ')}
        </div>
      )}
      {missing.length === 0 && disabled && (
        <span className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
          AI key not configured on the server
        </span>
      )}
    </div>
  );
}

function AnalysisView({ a }: { a: assistant.AnalyzeJdResponse }) {
  const tone =
    a.fitScore >= 80 ? 'text-emerald-600 dark:text-emerald-400'
    : a.fitScore >= 60 ? 'text-violet-600 dark:text-violet-400'
    : a.fitScore >= 40 ? 'text-amber-600 dark:text-amber-400'
    : 'text-rose-600 dark:text-rose-400';
  const verdict =
    a.fitScore >= 80 ? 'Strong fit'
    : a.fitScore >= 60 ? 'Worth applying'
    : a.fitScore >= 40 ? 'Stretch role'
    : 'Long shot';
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-3">
            <span className={`text-5xl font-semibold tabular-nums ${tone}`}>{a.fitScore}</span>
            <span className="text-sm text-ink-500 dark:text-ink-400">/ 100</span>
          </div>
          <div className={`mt-1 text-xs font-medium uppercase tracking-wide ${tone}`}>{verdict}</div>
        </div>
        <FitMeter score={a.fitScore} />
      </div>
      <p className="text-sm text-ink-700 dark:text-ink-300">{a.summary}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Section title="Strengths" items={a.strengths} dot="bg-emerald-500" />
        <Section title="Gaps" items={a.gaps} dot="bg-rose-500" />
      </div>
      <KeywordCloud keywords={a.suggestedKeywords} />
    </div>
  );
}

function FitMeter({ score }: { score: number }) {
  const color =
    score >= 80 ? 'stroke-emerald-500'
    : score >= 60 ? 'stroke-violet-500'
    : score >= 40 ? 'stroke-amber-500'
    : 'stroke-rose-500';
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-ink-200 dark:stroke-ink-800" />
      <circle
        cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
        className={color}
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

function Section({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (items.length === 0) {
    return (
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">{title}</div>
        <p className="text-sm text-ink-400 dark:text-ink-500">— none —</p>
      </div>
    );
  }
  return (
    <div>
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

function KeywordCloud({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        Surface these keywords
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((k, i) => (
          <button
            key={i}
            onClick={() => navigator.clipboard.writeText(k)}
            title="Click to copy"
            className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-800 ring-1 ring-inset ring-accent-200 transition-colors hover:bg-accent-100 dark:bg-accent-500/10 dark:text-accent-200 dark:ring-accent-500/30 dark:hover:bg-accent-500/20"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChangeList({ changes }: { changes: string[] }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" /></svg>
        What changed
      </div>
      <ul className="space-y-1.5 text-sm">
        {changes.map((c, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-ink-700 dark:text-ink-300">{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label, hint, children, className = ''
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</span>
        {hint && <span className="text-[10px] text-ink-400 dark:text-ink-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function SectionLabel({
  index, title, hint
}: { index: string; title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold tabular-nums text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          {index}
        </span>
        <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{title}</span>
      </div>
      {hint && <span className="text-[10px] text-ink-400 dark:text-ink-500">{hint}</span>}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? 'rounded-full bg-ink-900 px-3 py-1 text-xs font-medium text-white shadow-sm dark:bg-accent-500'
          : 'rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800'
      }
    >
      {children}
    </button>
  );
}

function ViewToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex-1 rounded px-2.5 py-1 text-xs font-medium bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-ink-50'
          : 'flex-1 rounded px-2.5 py-1 text-xs font-medium text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'
      }
    >
      {children}
    </button>
  );
}

function PulsingBars() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-3/4 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
      <div className="h-3 w-full animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      {message}
    </div>
  );
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function renderMarkdown(md: string): ReactNode {
  const lines = md.split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#\s+/.test(line)) {
      out.push(
        <h2 key={key++} className="mb-2 mt-1 text-lg font-semibold text-ink-900 dark:text-ink-50">
          {inlineMd(line.replace(/^#\s+/, ''))}
        </h2>
      );
      i++;
    } else if (/^##\s+/.test(line)) {
      out.push(
        <h3 key={key++} className="mb-2 mt-4 border-b border-ink-200 pb-1 text-base font-semibold text-ink-900 dark:border-ink-800 dark:text-ink-50">
          {inlineMd(line.replace(/^##\s+/, ''))}
        </h3>
      );
      i++;
    } else if (/^###\s+/.test(line)) {
      out.push(
        <h4 key={key++} className="mb-1 mt-3 text-sm font-semibold text-ink-800 dark:text-ink-200">
          {inlineMd(line.replace(/^###\s+/, ''))}
        </h4>
      );
      i++;
    } else if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push(
        <ul key={key++} className="mb-3 ml-5 list-disc space-y-1 text-sm text-ink-700 dark:text-ink-300">
          {items.map((it, j) => <li key={j}>{inlineMd(it)}</li>)}
        </ul>
      );
    } else if (line.trim() === '') {
      i++;
    } else {
      out.push(
        <p key={key++} className="mb-2 text-sm leading-relaxed text-ink-700 dark:text-ink-300">
          {inlineMd(line)}
        </p>
      );
      i++;
    }
  }
  return out;
}

function inlineMd(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let rest = text;
  let key = 0;
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/;
  while (rest.length) {
    const m = re.exec(rest);
    if (!m) {
      parts.push(rest);
      break;
    }
    if (m.index > 0) parts.push(rest.slice(0, m.index));
    const t = m[0];
    if (t.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold text-ink-900 dark:text-ink-100">{t.slice(2, -2)}</strong>);
    } else if (t.startsWith('`')) {
      parts.push(<code key={key++} className="rounded bg-ink-100 px-1 font-mono text-[12px] text-ink-800 dark:bg-ink-800 dark:text-ink-200">{t.slice(1, -1)}</code>);
    } else {
      parts.push(<em key={key++}>{t.slice(1, -1)}</em>);
    }
    rest = rest.slice(m.index + t.length);
  }
  return parts;
}

function formatErr(err: unknown): string {
  if (err instanceof HttpError) {
    if (err.status === 503) {
      const detail = (err.body?.detail ?? '').toLowerCase();
      if (detail.includes('quota') || detail.includes('exhausted'))
        return 'AI is resting for the day. Please try again in a few hours.';
      if (detail.includes('not configured') || detail.includes('not set'))
        return 'AI is not set up on the server yet.';
      return 'AI is taking a short break. Please try again in a moment.';
    }
    if (err.status === 401) return 'Please sign in again.';
    if (err.status === 400) return err.body?.detail ?? 'Please check your inputs and try again.';
    return err.body?.detail ?? err.body?.title ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Request failed.';
}
