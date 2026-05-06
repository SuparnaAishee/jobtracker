import type { TimePoint } from '../../api/stats';

interface Props {
  points: TimePoint[];
}

export function TimeSeriesChart({ points }: Props) {
  const W = 600;
  const H = 180;
  const padX = 32;
  const padY = 24;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  if (points.length === 0)
    return <div className="text-sm text-ink-500">No data yet.</div>;

  const max = Math.max(1, ...points.map((p) => p.count));
  const stepX = innerW / Math.max(1, points.length - 1);

  const coords = points.map((p, i) => {
    const x = padX + stepX * i;
    const y = padY + innerH - (p.count / max) * innerH;
    return { x, y, p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padY + innerH} L ${coords[0].x} ${padY + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Applications per week">
      <defs>
        <linearGradient id="ts-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((t) => {
        const y = padY + innerH * (1 - t);
        return (
          <line
            key={t}
            x1={padX}
            x2={W - padX}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="3 3"
          />
        );
      })}

      <path d={areaPath} fill="url(#ts-fill)" />
      <path d={linePath} fill="none" stroke="rgb(139 92 246)" strokeWidth="2" />

      {coords.map((c) => (
        <g key={c.p.weekStartIso}>
          <circle cx={c.x} cy={c.y} r="3" fill="rgb(139 92 246)" />
          <title>{`Week of ${c.p.weekStartIso}: ${c.p.count}`}</title>
        </g>
      ))}

      {coords.map((c, i) => {
        if (i % 2 !== 0) return null;
        const d = new Date(c.p.weekStartIso);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return (
          <text
            key={c.p.weekStartIso + 'l'}
            x={c.x}
            y={H - 6}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            opacity="0.55"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
