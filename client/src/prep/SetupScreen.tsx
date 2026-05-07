import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as resumes from '../api/resumes';
import * as jobApps from '../api/jobApplications';
import type { JobApplication } from '../types';
import { JdField } from '../components/JdField';
import { ResumePickerField } from '../components/ResumePickerField';
import { ApplicationContextPicker } from '../components/ApplicationContextPicker';
import { MODES, getMode } from './modes';
import {
  ALL_CATEGORIES,
  ALL_DIFFICULTIES,
  type Category,
  type Difficulty,
  type SessionConfig
} from './types';

interface Props {
  generating: boolean;
  generateError: string | null;
  configured: boolean | null;
  initialConfig?: Partial<SessionConfig>;
  onStart: (config: SessionConfig) => void;
}

const DEFAULT_CONFIG: SessionConfig = {
  modeId: 'practice',
  jobDescription: '',
  resume: '',
  role: '',
  count: 8,
  categoryFilter: [],
  difficultyFilter: []
};

export function SetupScreen({ generating, generateError, configured, initialConfig, onStart }: Props) {
  const [config, setConfigState] = useState<SessionConfig>(() => {
    const mode = getMode(initialConfig?.modeId ?? DEFAULT_CONFIG.modeId);
    return { ...DEFAULT_CONFIG, ...mode.defaults, ...initialConfig };
  });

  const [uploadedResumes, setUploadedResumes] = useState<resumes.Resume[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  useEffect(() => {
    resumes
      .list()
      .then(setUploadedResumes)
      .catch(() => setUploadedResumes([]));
    jobApps
      .list({ pageSize: 50, sortBy: 'updatedAt', sortDescending: true })
      .then((r) => setApplications(r.items))
      .catch(() => setApplications([]));
  }, []);

  const setConfig = (patch: Partial<SessionConfig>) =>
    setConfigState((prev) => ({ ...prev, ...patch }));

  const switchMode = (modeId: string) => {
    const mode = getMode(modeId);
    setConfigState((prev) => ({ ...prev, modeId, ...mode.defaults }));
  };

  const pickApplication = (id: string) => {
    setSelectedAppId(id);
    if (!id) return;
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    if (!config.role) setConfig({ role: app.position });
  };

  const toggle = <T extends string>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const activeMode = getMode(config.modeId);
  const blocked = generating || configured === false || !config.jobDescription.trim();

  return (
    <div className="space-y-8">
      {applications.length > 0 && (
        <ApplicationContextPicker
          applications={applications}
          selectedId={selectedAppId}
          onPick={pickApplication}
          onClear={() => {
            setSelectedAppId('');
            setConfig({ role: '' });
          }}
        />
      )}

      <section>
        <SectionTitle index="1" title="Pick a mode" />
        <div className="grid gap-4 md:grid-cols-2">
          {MODES.map((m) => (
            <ModeCard
              key={m.id}
              active={config.modeId === m.id}
              label={m.label}
              tagline={m.tagline}
              bullets={m.bullets}
              icon={modeIcon(m.id)}
              onClick={() => switchMode(m.id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle index="2" title="Job context" />
        <div className="card space-y-5 p-5">
          <JdField value={config.jobDescription} onChange={(v) => setConfig({ jobDescription: v })} />
          <ResumePickerField
            value={config.resume}
            onChange={(v) => setConfig({ resume: v })}
            uploadedResumes={uploadedResumes}
            setUploadedResumes={setUploadedResumes}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="label">Role hint (optional)</span>
              <input
                value={config.role}
                onChange={(e) => setConfig({ role: e.target.value })}
                placeholder="e.g. Senior Backend Engineer"
                className="input"
              />
            </div>
            <div className="space-y-1">
              <span className="label">Number of questions</span>
              <input
                type="number"
                min={3}
                max={15}
                value={config.count}
                onChange={(e) =>
                  setConfig({ count: Math.max(3, Math.min(15, Number(e.target.value) || 8)) })
                }
                className="input"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle index="3" title="Filters (optional)" />
        <div className="card space-y-4 p-5">
          <FilterRow
            label="Categories"
            options={ALL_CATEGORIES}
            selected={config.categoryFilter}
            onToggle={(v) => setConfig({ categoryFilter: toggle(config.categoryFilter, v as Category) })}
            emptyMeans="all"
          />
          <FilterRow
            label="Difficulty"
            options={ALL_DIFFICULTIES}
            selected={config.difficultyFilter}
            onToggle={(v) => setConfig({ difficultyFilter: toggle(config.difficultyFilter, v as Difficulty) })}
            emptyMeans="all"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle index="4" title={`${activeMode.label} options`} />
        <div className="card p-5">
          <activeMode.SetupExtras config={config} setConfig={setConfig} />
        </div>
      </section>

      {generateError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {generateError}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onStart(config)}
          disabled={blocked}
          className="btn-primary px-6 py-2.5 text-sm font-semibold"
        >
          {generating ? 'Generating questions…' : `Start ${activeMode.label.toLowerCase()}`}
        </button>
      </div>

      {configured === false && (
        <div className="text-right text-xs text-amber-600 dark:text-amber-400">
          AI is not configured on the server.
        </div>
      )}
    </div>
  );
}

function ModeCard({
  active,
  label,
  tagline,
  bullets,
  icon,
  onClick
}: {
  active: boolean;
  label: string;
  tagline: string;
  bullets: string[];
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'card relative overflow-hidden p-5 text-left ring-2 ring-accent-500'
          : 'card p-5 text-left transition-shadow hover:shadow-lift'
      }
    >
      {active && (
        <div className="absolute right-3 top-3 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          Selected
        </div>
      )}
      <div
        className={
          active
            ? 'mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/15 text-accent-600 dark:text-accent-400'
            : 'mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300'
        }
      >
        {icon}
      </div>
      <div className="text-base font-semibold text-ink-900 dark:text-ink-50">{label}</div>
      <div className="mt-0.5 text-sm text-ink-600 dark:text-ink-400">{tagline}</div>
      <ul className="mt-3 space-y-1 text-xs text-ink-600 dark:text-ink-400">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ink-400 dark:bg-ink-500" />
            {b}
          </li>
        ))}
      </ul>
    </button>
  );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold tabular-nums text-ink-700 dark:bg-ink-800 dark:text-ink-200">
        {index}
      </span>
      <span className="text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</span>
    </div>
  );
}

function FilterRow({
  label,
  options,
  selected,
  onToggle,
  emptyMeans
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  emptyMeans: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
          {label}
        </span>
        {selected.length === 0 && (
          <span className="text-[10px] text-ink-400 dark:text-ink-500">— {emptyMeans} —</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={
                active
                  ? 'rounded-full bg-ink-900 px-3 py-1 text-xs font-medium text-white shadow-sm dark:bg-accent-500'
                  : 'rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800'
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function modeIcon(id: string): ReactNode {
  if (id === 'mock') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 1.5" />
        <path d="M9 2h6" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h12a3 3 0 013 3v13H7a3 3 0 01-3-3z" />
      <path d="M4 17a3 3 0 013-3h12" />
      <path d="M9 8h7M9 12h5" />
    </svg>
  );
}
