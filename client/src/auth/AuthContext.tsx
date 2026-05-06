import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { tokenStorage } from '../api/client';
import * as authApi from '../api/auth';
import type { AuthResponse } from '../types';

interface AuthState {
  user: { id: string; email: string; displayName: string } | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

interface StoredAuth {
  token: string;
  userId: string;
  email: string;
  displayName: string;
  expiresAtUtc: string;
}

const USER_KEY = 'jobtrackr.user';

const persist = (resp: AuthResponse) => {
  tokenStorage.set(resp.accessToken);
  const stored: StoredAuth = {
    token: resp.accessToken,
    userId: resp.userId,
    email: resp.email,
    displayName: resp.displayName,
    expiresAtUtc: resp.expiresAtUtc
  };
  localStorage.setItem(USER_KEY, JSON.stringify(stored));
};

const loadPersisted = (): StoredAuth | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (new Date(parsed.expiresAtUtc).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      tokenStorage.set(persisted.token);
      setToken(persisted.token);
      setUser({ id: persisted.userId, email: persisted.email, displayName: persisted.displayName });
    } else {
      tokenStorage.clear();
      localStorage.removeItem(USER_KEY);
    }
    setLoading(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      loading,
      login: async (email, password) => {
        const resp = await authApi.login(email, password);
        persist(resp);
        setToken(resp.accessToken);
        setUser({ id: resp.userId, email: resp.email, displayName: resp.displayName });
      },
      register: async (email, password, displayName) => {
        const resp = await authApi.register(email, password, displayName);
        persist(resp);
        setToken(resp.accessToken);
        setUser({ id: resp.userId, email: resp.email, displayName: resp.displayName });
      },
      logout: () => {
        tokenStorage.clear();
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      }
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
