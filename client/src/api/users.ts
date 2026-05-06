import { apiFetch } from './client';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  publicSlug: string | null;
  isPublic: boolean;
}

export const me = () => apiFetch<UserProfile>('/api/users/me');

export const updatePublicProfile = (isPublic: boolean, publicSlug: string | null) =>
  apiFetch<UserProfile>('/api/users/me/public-profile', {
    method: 'PUT',
    body: JSON.stringify({ isPublic, publicSlug })
  });
