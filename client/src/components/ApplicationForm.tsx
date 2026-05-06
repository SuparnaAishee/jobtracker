import { useState, type FormEvent } from 'react';
import {
  ApplicationStatus,
  StatusLabels,
  type CreateJobApplicationRequest,
  type JobApplication
} from '../types';
import { HttpError } from '../api/client';

interface Props {
  initial?: JobApplication;
  onSubmit: (request: CreateJobApplicationRequest) => Promise<void>;
  onCancel: () => void;
}

export function ApplicationForm({ initial, onSubmit, onCancel }: Props) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '');
  const [position, setPosition] = useState(initial?.position ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [jobUrl, setJobUrl] = useState(initial?.jobUrl ?? '');
  const [salaryMin, setSalaryMin] = useState(initial?.salaryMin?.toString() ?? '');
  const [salaryMax, setSalaryMax] = useState(initial?.salaryMax?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(initial?.status ?? ApplicationStatus.Applied);
  const [appliedOn, setAppliedOn] = useState(
    initial?.appliedOn ? initial.appliedOn.slice(0, 10) : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initial;

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        companyName: companyName.trim(),
        position: position.trim(),
        location: location.trim() || null,
        jobUrl: jobUrl.trim() || null,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        notes: notes.trim() || null,
        status,
        appliedOn: appliedOn ? new Date(appliedOn).toISOString() : null
      });
    } catch (err) {
      if (err instanceof HttpError && err.body?.errors) {
        setError(Object.values(err.body.errors).flat().join(' '));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handle} className="space-y-5 animate-slide-up">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" required>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="input" placeholder="Stripe" />
        </Field>
        <Field label="Position" required>
          <input value={position} onChange={(e) => setPosition(e.target.value)} required className="input" placeholder="Senior Backend Engineer" />
        </Field>
        <Field label="Location">
          <input value={location ?? ''} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="Remote / NYC" />
        </Field>
        <Field label="Status" required>
          <select value={status} onChange={(e) => setStatus(Number(e.target.value) as ApplicationStatus)} className="input">
            {Object.entries(StatusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Salary min">
          <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="input" placeholder="100000" />
        </Field>
        <Field label="Salary max">
          <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className="input" placeholder="140000" />
        </Field>
        <Field label="Applied on">
          <input type="date" value={appliedOn} onChange={(e) => setAppliedOn(e.target.value)} className="input" />
        </Field>
        <Field label="Job URL">
          <input value={jobUrl ?? ''} onChange={(e) => setJobUrl(e.target.value)} className="input" placeholder="https://..." />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea value={notes ?? ''} onChange={(e) => setNotes(e.target.value)} rows={3} className="input resize-y" placeholder="Referred by Sam. Phone screen next Tuesday." />
        </Field>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save application'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
  className = ''
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label}
        {required && <span className="ml-0.5 text-accent-500">*</span>}
      </span>
      {children}
    </label>
  );
}
