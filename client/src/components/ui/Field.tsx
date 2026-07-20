import { forwardRef, useId, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
  hint?: string;
}

/** Rounded, fully-bordered form field with a soft gold focus ring (DESIGN.md v2 Form Fields). */
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
        <label htmlFor={inputId} className="block text-label-md font-label-md text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
            <Icon name={icon} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          className={cn(
            'w-full px-4 py-3 bg-surface border rounded-lg text-body-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary-container/40 focus:border-primary transition-colors',
            'placeholder:text-on-surface-variant/50',
            icon && 'pl-10',
            isPassword && 'pr-10',
            error ? 'border-error' : 'border-outline-variant',
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
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

/** Rounded, bordered select matching Field's styling. */
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
          'bg-surface border rounded-lg font-label-md text-label-md px-4 py-2.5',
          'focus:outline-none focus:ring-2 focus:ring-primary-container/40 focus:border-primary transition-colors',
          error ? 'border-error' : 'border-outline-variant',
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
