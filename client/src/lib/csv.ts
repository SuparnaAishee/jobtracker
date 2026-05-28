import {
  ApplicationStatus,
  StatusLabels,
  type CreateJobApplicationRequest
} from '../types';

/**
 * Parse CSV text into a matrix of cells. Handles quoted fields, embedded
 * commas/newlines, and escaped double-quotes (""), per RFC 4180. Tolerates
 * both \r\n and \n line endings. Blank trailing lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // Strip a leading UTF-8 BOM if present (common in Excel exports).
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++; // swallow \r\n as one break
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }

  // Flush the final field/row if the file didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop rows that are entirely empty (e.g. stray blank lines).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Recognized column header → canonical field, after normalization. */
const COLUMN_ALIASES: Record<string, keyof CreateJobApplicationRequest> = {
  company: 'companyName',
  companyname: 'companyName',
  employer: 'companyName',
  position: 'position',
  role: 'position',
  title: 'position',
  jobtitle: 'position',
  location: 'location',
  joburl: 'jobUrl',
  url: 'jobUrl',
  link: 'jobUrl',
  salarymin: 'salaryMin',
  minsalary: 'salaryMin',
  salarymax: 'salaryMax',
  maxsalary: 'salaryMax',
  status: 'status',
  appliedon: 'appliedOn',
  applieddate: 'appliedOn',
  dateapplied: 'appliedOn',
  applied: 'appliedOn',
  date: 'appliedOn',
  notes: 'notes',
  note: 'notes',
  jd: 'jobDescription',
  description: 'jobDescription',
  jobdescription: 'jobDescription',
  jobdesc: 'jobDescription'
};

const normalizeHeader = (h: string): string =>
  h.trim().toLowerCase().replace(/[\s_\-./]/g, '');

const STATUS_BY_LABEL: Record<string, ApplicationStatus> = Object.fromEntries(
  Object.entries(StatusLabels).map(([value, label]) => [
    label.toLowerCase(),
    Number(value) as ApplicationStatus
  ])
);

function parseStatus(raw: string): { value: ApplicationStatus; warning?: string } {
  const v = raw.trim();
  if (v === '') return { value: ApplicationStatus.Applied };

  if (/^\d+$/.test(v)) {
    const n = Number(v);
    if (n in StatusLabels) return { value: n as ApplicationStatus };
  }

  const byLabel = STATUS_BY_LABEL[v.toLowerCase()];
  if (byLabel !== undefined) return { value: byLabel };

  return {
    value: ApplicationStatus.Applied,
    warning: `Status "${v}" not recognized — defaulted to Applied.`
  };
}

function parseMoney(raw: string): { value: number | null; warning?: string } {
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  if (cleaned === '') return { value: null };
  const n = Number(cleaned);
  if (Number.isNaN(n)) return { value: null, warning: `Couldn't read salary "${raw}".` };
  return { value: n };
}

function parseDate(raw: string): { value: string | null; warning?: string } {
  const v = raw.trim();
  if (v === '') return { value: null };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { value: null, warning: `Couldn't read date "${raw}".` };
  return { value: d.toISOString() };
}

export interface ParsedRow {
  /** 1-based line number in the source file (header is line 1). */
  lineNumber: number;
  request: CreateJobApplicationRequest;
  /** Non-fatal client-side notes (e.g. unrecognized status defaulted). */
  warnings: string[];
}

export interface ParsedCsv {
  rows: ParsedRow[];
  recognizedColumns: string[];
  ignoredColumns: string[];
}

/**
 * Map parsed CSV cells into job-application create requests. Required-field
 * validation is left to the server; this only converts types and surfaces
 * soft warnings. Throws if the company/position columns are entirely missing.
 */
export function csvToApplications(text: string): ParsedCsv {
  const matrix = parseCsv(text);
  if (matrix.length === 0) {
    throw new Error('The file is empty.');
  }

  const headerCells = matrix[0];
  const recognized: string[] = [];
  const ignored: string[] = [];
  // Map each column index to a canonical field (or null if unrecognized).
  const colField: (keyof CreateJobApplicationRequest | null)[] = headerCells.map((h) => {
    const field = COLUMN_ALIASES[normalizeHeader(h)] ?? null;
    if (field) recognized.push(h.trim());
    else if (h.trim() !== '') ignored.push(h.trim());
    return field;
  });

  if (!colField.includes('position')) {
    throw new Error(
      'CSV must have a "position" column. Download the template for the expected format.'
    );
  }

  const rows: ParsedRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    const warnings: string[] = [];

    const cell = (field: keyof CreateJobApplicationRequest): string => {
      const idx = colField.indexOf(field);
      return idx >= 0 ? (cells[idx] ?? '').trim() : '';
    };

    const status = parseStatus(cell('status'));
    if (status.warning) warnings.push(status.warning);
    const salaryMin = parseMoney(cell('salaryMin'));
    if (salaryMin.warning) warnings.push(salaryMin.warning);
    const salaryMax = parseMoney(cell('salaryMax'));
    if (salaryMax.warning) warnings.push(salaryMax.warning);
    const appliedOn = parseDate(cell('appliedOn'));
    if (appliedOn.warning) warnings.push(appliedOn.warning);

    rows.push({
      lineNumber: r + 1,
      request: {
        companyName: cell('companyName'),
        position: cell('position'),
        location: cell('location') || null,
        jobUrl: cell('jobUrl') || null,
        salaryMin: salaryMin.value,
        salaryMax: salaryMax.value,
        notes: cell('notes') || null,
        jobDescription: cell('jobDescription') || null,
        status: status.value,
        appliedOn: appliedOn.value
      },
      warnings
    });
  }

  return { rows, recognizedColumns: recognized, ignoredColumns: ignored };
}

/** A sample CSV (header + two example rows) users can download and fill in. */
export function buildTemplateCsv(): string {
  const header =
    'company,position,location,jobUrl,salaryMin,salaryMax,status,appliedOn,notes,jobDescription';
  const example1 =
    'Stripe,Senior Backend Engineer,Remote,https://stripe.com/jobs/123,120000,160000,Applied,2026-05-01,Referred by Sam,"Build and scale payment APIs used by millions of businesses."';
  const example2 =
    'Acme Corp,Platform Engineer,NYC,,,,Saved,,Found on LinkedIn,"Own our platform infrastructure: Kubernetes, Terraform, CI/CD."';
  return [header, example1, example2].join('\r\n') + '\r\n';
}
