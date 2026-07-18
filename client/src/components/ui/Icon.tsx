import { cn } from '../../lib/cn';

export interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
}

/** Material Symbols Outlined glyph. `filled` toggles the FILL axis used across the Stitch mocks for emphasis icons. */
export function Icon({ name, className, filled = false, size }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined', filled && 'fill', className)}
      style={size ? { fontSize: size, width: size, height: size } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
