import type { JobApplication } from '../types';

interface Props {
  applications: JobApplication[];
  selectedId: string;
  onPick: (id: string) => void;
  onClear: () => void;
}

export function ApplicationContextPicker({ applications, selectedId, onPick, onClear }: Props) {
  if (applications.length === 0) return null;
  const selected = applications.find((a) => a.id === selectedId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        Working on
      </span>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onPick(e.target.value)}
          className="appearance-none rounded-full border border-ink-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-ink-800 transition-colors hover:border-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/40 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200"
        >
          <option value="">— a new role (no application) —</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>
              {a.companyName} · {a.position}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M5.5 7.5L10 12l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {selected && (
        <button
          onClick={onClear}
          className="text-xs text-ink-500 underline-offset-2 hover:underline dark:text-ink-400"
        >
          Clear
        </button>
      )}
    </div>
  );
}
