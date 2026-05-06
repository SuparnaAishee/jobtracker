export const ApplicationStatus = {
  Saved: 0,
  Applied: 1,
  Screening: 2,
  Interviewing: 3,
  Offer: 4,
  Rejected: 5,
  Withdrawn: 6,
  Accepted: 7
} as const;

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const StatusLabels: Record<ApplicationStatus, string> = {
  0: 'Saved',
  1: 'Applied',
  2: 'Screening',
  3: 'Interviewing',
  4: 'Offer',
  5: 'Rejected',
  6: 'Withdrawn',
  7: 'Accepted'
};

export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  userId: string;
  email: string;
  displayName: string;
}

export interface JobApplication {
  id: string;
  companyName: string;
  position: string;
  location: string | null;
  jobUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  notes: string | null;
  status: ApplicationStatus;
  appliedOn: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CreateJobApplicationRequest {
  companyName: string;
  position: string;
  location?: string | null;
  jobUrl?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  notes?: string | null;
  status: ApplicationStatus;
  appliedOn?: string | null;
}

export interface ApiError {
  title: string;
  detail?: string;
  status: number;
  errors?: Record<string, string[]>;
}
