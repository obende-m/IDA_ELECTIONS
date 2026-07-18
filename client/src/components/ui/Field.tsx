import { forwardRef, useId, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
  hint?: string;
}

/** High-security form field: label above, icon prefix, 2px black bottom border, gold focus border (DESIGN.md Form Fields). */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, error, hint, className, id, type = 'text', ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-label-md font-label-md text-on-background uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-0 bottom-3 text-on-surface-variant pointer-events-none">
            <Icon name={icon} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          className={cn(
            'w-full py-3 bg-transparent border-b-2 text-headline-sm font-headline-sm',
            'focus:outline-none focus:border-primary transition-colors',
            'placeholder:text-surface-container-highest',
            icon && 'pl-8',
            isPassword && 'pr-10',
            error ? 'border-error' : 'border-on-background',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-0 bottom-3 text-primary"
            aria-label={visible ? 'Hide value' : 'Show value'}
          >
            <Icon name={visible ? 'visibility_off' : 'visibility'} />
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-label-sm font-label-sm text-error">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-label-sm font-label-sm text-secondary">
          {hint}
        </p>
      )}
    </div>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

/** Bordered select matching the dashboard's "Real-time (Auto)" and filter dropdown styling. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, className, id, children, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={selectId} className="block text-label-sm font-label-sm text-secondary uppercase tracking-widest">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'bg-surface border-2 font-label-md text-label-md px-4 py-2',
          'focus:outline-none focus:border-primary transition-colors',
          error ? 'border-error' : 'border-on-background',
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-label-sm font-label-sm text-error">{error}</p>}
    </div>
  );
});
