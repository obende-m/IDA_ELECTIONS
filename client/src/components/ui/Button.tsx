import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost';
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
  // DESIGN.md: "Solid Black background, White text, 0px radius. On hover, the border changes to Primary Gold."
  primary:
    'bg-on-background text-on-primary border-2 border-on-background hover:border-primary-container',
  // DESIGN.md: "White background, 2px Black border, Black text."
  secondary:
    'bg-surface text-on-background border-2 border-on-background hover:bg-surface-container-high',
  // DESIGN.md: "For the final Cast Vote action, use a Primary Gold background."
  gold:
    'bg-primary-container text-on-primary-container border-2 border-on-background font-bold hover:brightness-95',
  danger: 'bg-error text-on-error border border-error hover:bg-transparent hover:text-error',
  ghost: 'bg-transparent text-secondary border border-transparent hover:bg-surface-container',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-label-sm font-label-sm gap-2',
  md: 'px-6 py-3 text-label-md font-label-md gap-3',
  lg: 'px-8 py-5 text-headline-sm font-headline-sm gap-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    uppercase = false,
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    className,
    disabled,
    children,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center transition-all active:scale-[0.98]',
        'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        uppercase && 'uppercase tracking-widest',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <>
          {leftIcon && <Icon name={leftIcon} />}
          {children}
          {rightIcon && <Icon name={rightIcon} />}
        </>
      )}
    </button>
  );
});
