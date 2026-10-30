import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost' | 'ink';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  uppercase?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Civic teal: the one primary action on a screen.
  primary: 'bg-primary text-on-primary hover:bg-primary-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]',
  // Ink: equal-weight dark action (navigation-style CTAs).
  ink: 'bg-on-background text-on-primary hover:bg-[#2a2f31]',
  secondary:
    'bg-surface-container-lowest text-on-background border border-outline-variant hover:border-outline hover:bg-surface-bright',
  // The final, irreversible ballot action keeps IDA brass so it reads as "the" moment.
  gold: 'bg-primary-container text-on-primary-container font-semibold hover:brightness-[0.96] shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)]',
  danger: 'bg-error text-on-error hover:brightness-95',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-background',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[0.8125rem] font-medium gap-1.5 rounded-md',
  md: 'h-11 px-5 text-label-md font-medium gap-2 rounded-lg',
  lg: 'h-14 px-7 text-[1rem] font-semibold gap-2.5 rounded-xl',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', uppercase = false, fullWidth = false, loading = false, leftIcon, rightIcon, className, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'group/btn relative inline-flex items-center justify-center whitespace-nowrap select-none',
        'transition-[background-color,border-color,color,box-shadow,transform,filter] duration-200 ease-[var(--ease-out-quart)]',
        'active:scale-[0.985] disabled:opacity-45 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        uppercase && 'uppercase tracking-[0.06em]',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </span>
      )}
      <span className={cn('inline-flex items-center gap-[inherit]', loading && 'invisible')}>
        {leftIcon && <Icon name={leftIcon} size={ICON_SIZE[size]} />}
        {children}
        {rightIcon && (
          <Icon name={rightIcon} size={ICON_SIZE[size]} className="transition-transform duration-200 group-hover/btn:translate-x-0.5" />
        )}
      </span>
    </button>
  );
});
