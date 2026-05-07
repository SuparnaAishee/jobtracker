import { useEffect, useState } from 'react';

const STORAGE_KEY = 'jobtrackr.assistant.onboarded.v1';

interface Props {
  hasResumes: boolean;
}

export function AssistantOnboardingBanner({ hasResumes }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  if (dismissed || hasResumes) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="card mb-5 flex items-start gap-3 border-accent-200 bg-accent-50/60 p-4 dark:border-accent-500/30 dark:bg-accent-500/10">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-accent-700 dark:text-accent-300">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-accent-900 dark:text-accent-100">
          Start by uploading a resume
        </div>
        <p className="mt-0.5 text-sm text-accent-800/90 dark:text-accent-200/90">
          Pick or upload a resume in the inputs panel — every output (fit score, tailored resume, cover letter) is grounded in what you've actually done.
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-accent-700/70 hover:text-accent-900 dark:text-accent-300/70 dark:hover:text-accent-100"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 5l10 10M15 5l-10 10" />
        </svg>
      </button>
    </div>
  );
}
