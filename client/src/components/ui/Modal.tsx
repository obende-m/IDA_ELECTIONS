import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** 'dialog' = centred panel; 'drawer' = slides in from the right (bottom sheet on phones). */
  variant?: 'dialog' | 'drawer';
  size?: 'sm' | 'md' | 'lg';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZE: Record<NonNullable<ModalProps['size']>, string> = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/**
 * Accessible dialog/drawer: role=dialog + aria-modal, labelled by its title, Escape closes, focus moves in on open,
 * Tab is trapped, focus returns to the trigger, background scroll is locked. Enter/exit are animated; on phones it
 * becomes a bottom sheet so forms stay reachable with one thumb.
 */
export function Modal({ open, onClose, title, description, children, footer, variant = 'dialog', size = 'md' }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  // Keep the node mounted through the exit animation.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusables = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    const firstField = focusables.find((el) => el.matches('input, select, textarea'));
    (firstField ?? dialog)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, mounted]);

  if (!mounted) return null;
  const drawer = variant === 'drawer';

  return createPortal(
    <div className={cn('fixed inset-0 z-[100] flex', drawer ? 'items-end sm:items-stretch sm:justify-end' : 'items-end sm:items-center justify-center sm:p-6')}>
      <div
        className={cn('absolute inset-0 bg-[#15181a]/45 backdrop-blur-[2px] transition-opacity duration-200', shown ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-surface-container-lowest flex flex-col focus:outline-none shadow-lg',
          'transition-[transform,opacity] duration-[220ms] ease-[var(--ease-out-quart)]',
          drawer
            ? 'max-h-[92vh] rounded-t-2xl sm:max-h-none sm:h-full sm:max-w-xl sm:rounded-none sm:border-l sm:border-outline-variant'
            : cn('max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-outline-variant', SIZE[size]),
          shown
            ? 'opacity-100 translate-y-0 translate-x-0 sm:scale-100'
            : cn('opacity-0 translate-y-6', drawer ? 'sm:translate-y-0 sm:translate-x-8' : 'sm:translate-y-2 sm:scale-[0.98]')
        )}
      >
        <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-outline-variant" aria-hidden="true" />
        {title && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-4 sm:px-7 sm:pt-6 border-b border-outline-variant">
            <div className="min-w-0">
              <h2 id={titleId} className="font-serif text-[1.375rem] leading-tight tracking-[-0.01em] break-words">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-[0.875rem] text-secondary">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 -mr-2 -mt-1 w-10 h-10 flex items-center justify-center rounded-lg text-secondary hover:text-on-background hover:bg-surface-container-low"
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        <div className="px-5 py-5 sm:px-7 sm:py-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-4 sm:px-7 border-t border-outline-variant bg-surface-bright flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 safe-bottom sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
