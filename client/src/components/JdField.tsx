interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  label?: string;
  placeholder?: string;
  showLabel?: boolean;
}

export function JdField({
  value,
  onChange,
  rows = 6,
  label = 'Job description',
  placeholder = 'Paste the full job description here…',
  showLabel = true
}: Props) {
  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
            {label}
          </span>
          {value && (
            <span className="text-[10px] text-ink-400 dark:text-ink-500">
              {value.length.toLocaleString()} chars
            </span>
          )}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="input resize-y"
      />
    </div>
  );
}
