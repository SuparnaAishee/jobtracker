import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (c: ThemeChoice) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);
const STORAGE_KEY = 'jobtrackr.theme';

const getSystem = (): ResolvedTheme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const apply = (resolved: ResolvedTheme) => {
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  });
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    choice === 'system' ? getSystem() : choice
  );

  useEffect(() => {
    const next = choice === 'system' ? getSystem() : choice;
    setResolved(next);
    apply(next);
    localStorage.setItem(STORAGE_KEY, choice);
  }, [choice]);

  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handle = () => {
      const next = mq.matches ? 'dark' : 'light';
      setResolved(next);
      apply(next);
    };
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, [choice]);

  const value = useMemo<ThemeState>(
    () => ({
      choice,
      resolved,
      setChoice: setChoiceState,
      toggle: () => setChoiceState(resolved === 'dark' ? 'light' : 'dark')
    }),
    [choice, resolved]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
