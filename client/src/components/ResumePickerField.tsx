import { useRef, useState } from 'react';
import * as resumes from '../api/resumes';
import { HttpError } from '../api/client';

interface Props {
  value: string;
  onChange: (value: string) => void;
  uploadedResumes: resumes.Resume[];
  setUploadedResumes: (next: resumes.Resume[]) => void;
  showLabel?: boolean;
}

export function ResumePickerField({
  value,
  onChange,
  uploadedResumes,
  setUploadedResumes,
  showLabel = true
}: Props) {
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [resumeStatus, setResumeStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickUploaded = async (id: string) => {
    setSelectedResumeId(id);
    if (!id) return;
    setResumeStatus('Extracting text…');
    try {
      const { text } = await resumes.getText(id);
      onChange(text);
      setResumeStatus(null);
    } catch (err) {
      setResumeStatus(`Could not extract: ${formatErr(err)}`);
    }
  };

  const onFilePicked = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setResumeStatus(`Uploading ${file.name}…`);
    try {
      const created = await resumes.upload(file, file.name);
      setUploadedResumes([created, ...uploadedResumes]);
      await pickUploaded(created.id);
    } catch (err) {
      setResumeStatus(`Upload failed: ${formatErr(err)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {showLabel ? (
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
            Your resume
          </span>
          {value && (
            <span className="text-[10px] text-ink-400 dark:text-ink-500">
              {value.length.toLocaleString()} chars
            </span>
          )}
        </div>
      ) : value ? (
        <div className="flex justify-end">
          <span className="text-[10px] text-ink-400 dark:text-ink-500">
            {value.length.toLocaleString()} chars
          </span>
        </div>
      ) : null}

      {!pasteMode ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={selectedResumeId}
              onChange={(e) => pickUploaded(e.target.value)}
              className="input flex-1 min-w-0"
            >
              <option value="">
                {uploadedResumes.length === 0 ? 'Upload your first resume →' : '— pick a saved resume —'}
              </option>
              {uploadedResumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label || r.originalFileName}
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-ghost shrink-0"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div>
              {resumeStatus && (
                <span className="text-ink-500 dark:text-ink-400">{resumeStatus}</span>
              )}
              {value && !resumeStatus && (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" />
                  </svg>
                  Resume loaded
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPasteMode(true)}
              className="text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline dark:text-ink-400 dark:hover:text-ink-200"
            >
              or paste text instead
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setSelectedResumeId('');
            }}
            rows={6}
            placeholder="Paste your resume as plain text…"
            className="input resize-y font-mono text-xs"
          />
          <div className="text-right text-xs">
            <button
              type="button"
              onClick={() => setPasteMode(false)}
              className="text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline dark:text-ink-400 dark:hover:text-ink-200"
            >
              ← back to file picker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatErr(err: unknown): string {
  if (err instanceof HttpError) return err.body?.detail ?? err.body?.title ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Request failed.';
}
