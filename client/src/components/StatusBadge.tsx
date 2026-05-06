import { ApplicationStatus, StatusLabels } from '../types';

const styles: Record<ApplicationStatus, string> = {
  [ApplicationStatus.Saved]:
    'bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700',
  [ApplicationStatus.Applied]:
    'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
  [ApplicationStatus.Screening]:
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  [ApplicationStatus.Interviewing]:
    'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  [ApplicationStatus.Offer]:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  [ApplicationStatus.Rejected]:
    'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
  [ApplicationStatus.Withdrawn]:
    'bg-ink-100 text-ink-500 ring-ink-200 dark:bg-ink-800 dark:text-ink-500 dark:ring-ink-700',
  [ApplicationStatus.Accepted]:
    'bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/40'
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {StatusLabels[status]}
    </span>
  );
}
