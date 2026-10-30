import type { ReactNode } from 'react';

export interface RadialProgressProps {
  value: number;
  size?: number;
  thickness?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
}

/** SVG ring (turnout). Animates on value change; the ring uses civic teal on a paper track. */
export function RadialProgress({ value, size = 192, thickness = 14, label, sublabel }: RadialProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-container)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          style={{ transition: 'stroke-dashoffset 900ms var(--ease-out-quart)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label}
        {sublabel}
      </div>
    </div>
  );
}
