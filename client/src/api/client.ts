import type { ApiError } from '../types';

const TOKEN_KEY = 'jobtrackr.token';

// Empty in local docker compose (nginx proxies /api → api container).
// Set at build time via VITE_API_URL when deploying api + web to different origins (e.g. Render).
export const API_BASE: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const buildUrl = (path: string): string =>
  API_BASE ? `${API_BASE}${path}` : path;

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

export class HttpError extends Error {
  status: number;
  body: ApiError | null;
  constructor(status: number, body: ApiError | null, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = tokenStorage.get();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(buildUrl(path), { ...init, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? safeParse(text) : null;

  if (!res.ok) {
    const err = body as ApiError | null;
    throw new HttpError(res.status, err, err?.title ?? `Request failed with ${res.status}`);
  }

  return body as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
