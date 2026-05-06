import { apiFetch, buildUrl, tokenStorage } from './client';

export interface Resume {
  id: string;
  label: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export const list = () => apiFetch<Resume[]>('/api/resumes');

export const upload = async (file: File, label: string): Promise<Resume> => {
  const form = new FormData();
  form.append('file', file);
  if (label) form.append('label', label);

  const token = tokenStorage.get();
  const res = await fetch(buildUrl('/api/resumes'), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return res.json();
};

export const remove = (id: string) =>
  apiFetch<void>(`/api/resumes/${id}`, { method: 'DELETE' });

export const downloadUrl = (id: string) => buildUrl(`/api/resumes/${id}`);
