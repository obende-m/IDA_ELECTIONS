import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Sharp-cornered, hard-bordered modal consistent with the "Government-Grade" flat elevation model. */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-margin-mobile">
      <div className="absolute inset-0 bg-on-background/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg bg-surface border-2 border-on-background flex flex-col max-h-[90vh]"
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-on-background">
            <h2 className="text-headline-sm font-headline-sm uppercase">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-surface-container-high">
              <Icon name="close" />
            </button>
          </div>
        )}
        <div className="px-6 py-6 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
