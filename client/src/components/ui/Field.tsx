import { forwardRef, useId, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
  hint?: string;
}

const CONTROL =
  'w-full h-11 px-3.5 bg-surface-container-lowest border rounded-lg text-[0.9375rem] text-on-background ' +
  'transition-[border-color,box-shadow] duration-150 placeholder:text-secondary/70 ' +
  'hover:border-outline focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_76_69/0.14)] focus:outline-none ' +
  'disabled:bg-surface-container-low disabled:text-secondary disabled:cursor-not-allowed';

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, error, hint, className, id, type = 'text', ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[0.8125rem] font-medium text-on-surface-variant">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          className={cn(CONTROL, icon && 'pl-10', isPassword && 'pr-11', error ? 'border-error' : 'border-outline-variant', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md flex items-center justify-center text-secondary hover:text-on-background hover:bg-surface-container-low"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            <Icon name={visible ? 'visibility_off' : 'visibility'} size={18} />
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="flex items-center gap-1.5 text-[0.8125rem] text-error">
          <Icon name="error" size={14} />
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-[0.8125rem] text-secondary">
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

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, className, id, children, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-[0.8125rem] font-medium text-on-surface-variant">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(CONTROL, 'appearance-none pr-9 cursor-pointer', error ? 'border-error' : 'border-outline-variant', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {children}
        </select>
        <Icon name="expand_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
      </div>
      {error && (
        <p id={`${selectId}-error`} className="text-[0.8125rem] text-error">
          {error}
        </p>
      )}
    </div>
  );
});

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

/** Search box with leading icon and a clear button (reference 1: prominent search field). */
export function SearchInput({ value, onChange, label = 'Search', placeholder = 'Search…', className, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(CONTROL, 'pl-10 pr-10 border-outline-variant [&::-webkit-search-cancel-button]:hidden')}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-on-background hover:bg-surface-container-low"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
