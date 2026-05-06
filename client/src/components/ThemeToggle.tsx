import { useTheme, type ThemeChoice } from '../theme/ThemeContext';

const order: ThemeChoice[] = ['light', 'dark', 'system'];

export function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  const next = order[(order.indexOf(choice) + 1) % order.length];

  return (
    <button
      onClick={() => setChoice(next)}
      title={`Theme: ${choice} (click for ${next})`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-400 dark:hover:bg-ink-850 dark:hover:text-ink-100"
      aria-label="Toggle theme"
    >
      {choice === 'light' && <SunIcon />}
      {choice === 'dark' && <MoonIcon />}
      {choice === 'system' && <SystemIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" strokeLinecap="round" />
    </svg>
  );
}
