import type { FunnelDto } from '../../api/stats';

interface Props {
  funnel: FunnelDto;
}

export function FunnelChart({ funnel }: Props) {
  const stages: { label: string; value: number; color: string }[] = [
    { label: 'Applied', value: funnel.applied, color: '#3b82f6' },
    { label: 'Screening', value: funnel.screening, color: '#f59e0b' },
    { label: 'Interviewing', value: funnel.interviewing, color: '#8b5cf6' },
    { label: 'Offer', value: funnel.offer, color: '#10b981' },
    { label: 'Accepted', value: funnel.accepted, color: '#059669' }
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <div className="space-y-3">
      {stages.map((s) => {
        const w = Math.max(4, Math.round((s.value / max) * 100));
        const conv = max === 0 ? 0 : Math.round((s.value / max) * 100);
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-ink-700 dark:text-ink-300">{s.label}</span>
              <span className="tabular-nums text-ink-500 dark:text-ink-500">
                {s.value} <span className="opacity-60">({conv}%)</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${w}%`, background: s.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
