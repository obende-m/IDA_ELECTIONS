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

const VARIANT_ICON: Record<ToastVariant, string> = {
  default: 'info',
  success: 'check_circle',
  error: 'error',
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: 'border-on-background text-on-background',
  success: 'border-primary-container text-on-background',
  error: 'border-error text-error',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setItems((prev) => [...prev, { id, variant: 'default', durationMs: 5000, ...options }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 w-full max-w-sm">
          {items.map((item) => (
            <div
              key={item.id}
              role="status"
              className={cn('bg-surface border-2 px-4 py-3 flex items-start gap-3 shadow-none', VARIANT_CLASSES[item.variant ?? 'default'])}
            >
              <Icon name={VARIANT_ICON[item.variant ?? 'default']} filled />
              <div className="flex-1">
                <p className="text-label-md font-label-md font-bold uppercase">{item.title}</p>
                {item.description && <p className="text-body-md text-secondary mt-1">{item.description}</p>}
              </div>
              <button onClick={() => dismiss(item.id)} aria-label="Dismiss notification" className="text-secondary hover:text-on-background">
                <Icon name="close" size={18} />
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
