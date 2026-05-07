import { useEffect, useRef } from 'react';

export function useCountdown(opts: {
  remainingSec: number | null;
  paused: boolean;
  onTick: (next: number) => void;
  onZero: () => void;
}) {
  const { remainingSec, paused, onTick, onZero } = opts;
  const fired = useRef(false);

  useEffect(() => {
    if (remainingSec == null || paused) return;
    if (remainingSec <= 0) {
      if (!fired.current) {
        fired.current = true;
        onZero();
      }
      return;
    }
    fired.current = false;
    const id = window.setInterval(() => {
      onTick(Math.max(0, remainingSec - 1));
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, paused]);
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
