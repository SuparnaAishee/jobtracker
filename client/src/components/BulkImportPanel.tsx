import { useRef, useState } from 'react';
import * as api from '../api/jobApplications';
import { HttpError } from '../api/client';
import { StatusLabels, type BulkImportResult } from '../types';
import { buildTemplateCsv, csvToApplications, type ParsedCsv } from '../lib/csv';

interface Props {
  /** Called after a successful import so the parent can refresh the list. */
  onImported: () => void;
  onClose: () => void;
}

const PREVIEW_LIMIT = 5;

export function BulkImportPanel({ onImported, onClose }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setParseError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    setParsed(null);
    setParseError(null);
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const out = csvToApplications(text);
      if (out.rows.length === 0) throw new Error('No data rows found below the header.');
      setParsed(out);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not read the file.');
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setParseError(null);
    try {
      const res = await api.bulkImport(parsed.rows.map((r) => r.request));
      setResult(res);
      if (res.created > 0) onImported();
    } catch (err) {
      if (err instanceof HttpError && err.body?.errors) {
        setParseError(Object.values(err.body.errors).flat().join(' '));
      } else {
        setParseError(err instanceof Error ? err.message : 'Import failed.');
      }
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jobtrackr-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const warningCount = parsed?.rows.reduce((n, r) => n + (r.warnings.length > 0 ? 1 : 0), 0) ?? 0;

  return (
    <div className="card mb-8 p-6 animate-slide-up">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50">Import from CSV</h2>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
            Upload a spreadsheet exported as CSV. Each row becomes an application.{' '}
            <button
              type="button"
              onClick={downloadTemplate}
              className="font-medium text-accent-600 underline-offset-2 hover:underline dark:text-accent-400"
            >
              Download template
            </button>
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost shrink-0">
          Close
        </button>
      </div>

      {/* Result summary takes over once an import has run. */}
      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Stat label="Imported" value={result.created} tone="emerald" />
            <Stat label="Skipped" value={result.failed} tone={result.failed > 0 ? 'rose' : 'ink'} />
            <Stat label="Total rows" value={result.total} tone="ink" />
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm dark:border-rose-500/30 dark:bg-rose-500/10">
              <p className="mb-2 font-medium text-rose-700 dark:text-rose-300">
                {result.errors.length} row{result.errors.length === 1 ? '' : 's'} could not be imported:
              </p>
              <ul className="max-h-48 space-y-1 overflow-auto text-rose-700 dark:text-rose-300">
                {result.errors.map((e) => (
                  <li key={e.index}>
                    {/* +2: skip the header line and convert 0-based to 1-based. */}
                    <span className="font-medium">Row {e.index + 2}:</span> {e.errors.join(' ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={reset} className="btn-ghost">
              Import another file
            </button>
            <button type="button" onClick={onClose} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">CSV file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block w-full text-sm text-ink-600 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-700 hover:file:bg-accent-100 dark:text-ink-400 dark:file:bg-accent-500/10 dark:file:text-accent-300"
            />
          </div>

          {parseError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {parseError}
            </div>
          )}

          {parsed && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600 dark:text-ink-400">
                <span>
                  <b className="font-semibold text-ink-900 dark:text-ink-100">{parsed.rows.length}</b>{' '}
                  row{parsed.rows.length === 1 ? '' : 's'} ready from{' '}
                  <span className="text-ink-700 dark:text-ink-300">{fileName}</span>
                </span>
                {warningCount > 0 && (
                  <span className="text-amber-700 dark:text-amber-400">{warningCount} with warnings</span>
                )}
                {parsed.ignoredColumns.length > 0 && (
                  <span>Ignored columns: {parsed.ignoredColumns.join(', ')}</span>
                )}
              </div>

              <div className="overflow-x-auto rounded-md border border-ink-100 dark:border-ink-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-900/60 dark:text-ink-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Company</th>
                      <th className="px-4 py-2 font-medium">Position</th>
                      <th className="px-4 py-2 font-medium">Location</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                    {parsed.rows.slice(0, PREVIEW_LIMIT).map((r) => (
                      <tr key={r.lineNumber}>
                        <td className="px-4 py-2 font-medium text-ink-900 dark:text-ink-100">
                          {r.request.companyName || <span className="italic text-ink-400">No company</span>}
                        </td>
                        <td className="px-4 py-2 text-ink-700 dark:text-ink-300">
                          {r.request.position || <span className="text-rose-500">(missing)</span>}
                        </td>
                        <td className="px-4 py-2 text-ink-600 dark:text-ink-400">{r.request.location ?? '—'}</td>
                        <td className="px-4 py-2 text-ink-600 dark:text-ink-400">{StatusLabels[r.request.status]}</td>
                        <td className="px-4 py-2 tabular-nums text-ink-600 dark:text-ink-400">
                          {r.request.appliedOn ? new Date(r.request.appliedOn).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > PREVIEW_LIMIT && (
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Showing first {PREVIEW_LIMIT} of {parsed.rows.length} rows.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={reset} className="btn-ghost">
                  Clear
                </button>
                <button type="button" onClick={handleImport} disabled={importing} className="btn-primary">
                  {importing ? 'Importing…' : `Import ${parsed.rows.length} application${parsed.rows.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'rose' | 'ink' }) {
  const tones: Record<typeof tone, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    rose: 'text-rose-700 dark:text-rose-400',
    ink: 'text-ink-900 dark:text-ink-100'
  };
  return (
    <div className="rounded-md border border-ink-100 px-4 py-2 dark:border-ink-800">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}
