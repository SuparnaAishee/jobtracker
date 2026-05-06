import { apiFetch } from './client';
import type { AuthResponse } from '../types';

export const login = (email: string, password: string) =>
  apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

export const register = (email: string, password: string, displayName: string) =>
  apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName })
  });
