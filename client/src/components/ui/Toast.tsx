import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, string> = { default: 'info', success: 'check_circle', error: 'error' };
const VARIANT_ACCENT: Record<ToastVariant, string> = { default: 'text-on-surface-variant', success: 'text-success', error: 'text-error' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, variant: 'default', durationMs: 5000, ...options }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? (options.variant === 'error' ? 8000 : 5000));
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div aria-live="polite" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-[200] flex flex-col gap-2.5 sm:w-[24rem]">
          {items.map((item) => (
            <div
              key={item.id}
              role={item.variant === 'error' ? 'alert' : 'status'}
              className="animate-rise bg-on-background text-on-primary rounded-xl pl-4 pr-2 py-3 flex items-start gap-3 shadow-lg"
            >
              <span className={cn('mt-0.5 w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0', VARIANT_ACCENT[item.variant ?? 'default'])}>
                <Icon name={VARIANT_ICON[item.variant ?? 'default']} size={15} strokeWidth={2.25} />
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[0.875rem] font-semibold">{item.title}</p>
                {item.description && <p className="text-[0.8125rem] text-on-primary/70 mt-0.5 break-words">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="focus-ring-light shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-on-primary/60 hover:text-on-primary hover:bg-white/10"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
