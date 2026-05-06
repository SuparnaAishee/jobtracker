import { apiFetch } from './client';
import type {
  ApplicationStatus,
  CreateJobApplicationRequest,
  JobApplication,
  PagedResult
} from '../types';

export interface ListQuery {
  search?: string;
  status?: ApplicationStatus;
  sortBy?: string;
  sortDescending?: boolean;
  page?: number;
  pageSize?: number;
}

export const list = (q: ListQuery = {}) => {
  const params = new URLSearchParams();
  if (q.search) params.set('search', q.search);
  if (q.status !== undefined) params.set('status', String(q.status));
  if (q.sortBy) params.set('sortBy', q.sortBy);
  if (q.sortDescending !== undefined) params.set('sortDescending', String(q.sortDescending));
  if (q.page) params.set('page', String(q.page));
  if (q.pageSize) params.set('pageSize', String(q.pageSize));

  const qs = params.toString();
  return apiFetch<PagedResult<JobApplication>>(`/api/job-applications${qs ? `?${qs}` : ''}`);
};

export const create = (body: CreateJobApplicationRequest) =>
  apiFetch<JobApplication>('/api/job-applications', {
    method: 'POST',
    body: JSON.stringify(body)
  });

export const update = (id: string, body: CreateJobApplicationRequest) =>
  apiFetch<JobApplication>(`/api/job-applications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });

export const remove = (id: string) =>
  apiFetch<void>(`/api/job-applications/${id}`, { method: 'DELETE' });
