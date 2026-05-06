import { apiFetch } from './client';

export interface StatusBreakdownItem {
  status: number;
  count: number;
}
export interface FunnelDto {
  saved: number;
  applied: number;
  screening: number;
  interviewing: number;
  offer: number;
  accepted: number;
}
export interface TimePoint {
  weekStartIso: string;
  count: number;
}
export interface StatsResponse {
  total: number;
  byStatus: StatusBreakdownItem[];
  funnel: FunnelDto;
  applicationsPerWeek: TimePoint[];
  offerRate: number | null;
  interviewRate: number | null;
}

export const myStats = () => apiFetch<StatsResponse>('/api/job-applications/stats');
export const publicStats = (slug: string) => apiFetch<StatsResponse>(`/api/public/${encodeURIComponent(slug)}/stats`);
