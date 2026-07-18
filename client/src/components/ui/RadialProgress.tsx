import type { ReactNode } from 'react';

export interface RadialProgressProps {
  value: number;
  size?: number;
  thickness?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
}

/** Gold conic-gradient donut used for the Live Results "Total Voter Turnout" ring. */
export function RadialProgress({ value, size = 192, thickness = 20, label, sublabel }: RadialProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="grid place-content-center rounded-full text-center"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(closest-side, white calc(100% - ${thickness}px), transparent calc(100% - ${thickness}px + 1px) 100%), conic-gradient(#d4af37 ${clamped * 3.6}deg, #f0eded 0deg)`,
      }}
    >
      <div className="flex flex-col items-center">
        {label}
        {sublabel}
      </div>
    </div>
  );
}
