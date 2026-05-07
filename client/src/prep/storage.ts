import type { SessionState } from './types';

const STORAGE_KEY = 'jobtrackr.prep.session.v1';

export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (!parsed?.id || !parsed?.config?.modeId || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let saveTimer: number | null = null;
export function saveSession(state: SessionState) {
  if (saveTimer != null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / serialization errors — session continues in memory
    }
  }, 250);
}

export function clearSession() {
  if (saveTimer != null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
