import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Promise-based confirmation dialog — replaces window.confirm with an accessible, on-brand dialog. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              {state?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={state?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
              {state?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="text-body-md text-on-surface-variant">{state?.message}</div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export interface MenuItem {
  label: string;
  icon?: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  hidden?: boolean;
}

/** Accessible "more actions" menu (button + role=menu, arrow keys, Escape, click-outside). */
export function ActionMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const visible = items.filter((i) => !i.hidden);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const width = 224;
      const below = window.innerHeight - r.bottom > visible.length * 44 + 24;
      setPos({ top: below ? r.bottom + 6 : r.top - 6 - visible.length * 42 - 12, left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)) });
    };
    place();
    const first = () => menuRef.current?.querySelector<HTMLElement>('[role=menuitem]:not([disabled])')?.focus();
    requestAnimationFrame(first);
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // Keep the menu attached to its button when the page or a scrolling table moves.
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, visible.length]);

  const onKey = (e: React.KeyboardEvent) => {
    const els = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not([disabled])') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      btnRef.current?.focus();
    }
  };

  if (visible.length === 0) return null;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:text-on-background hover:bg-surface-container-low transition-colors', open && 'bg-surface-container-low text-on-background')}
      >
        <Icon name="more" size={18} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            onKeyDown={onKey}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[150] w-56 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg p-1.5 animate-[pop_0.16s_var(--ease-out-quart)_both] origin-top-right"
          >
            {visible.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'w-full h-10 px-3 rounded-lg flex items-center gap-2.5 text-left text-[0.875rem] focus:outline-none disabled:opacity-40 disabled:pointer-events-none',
                  item.tone === 'danger' ? 'text-error hover:bg-error-container/60 focus:bg-error-container/60' : 'hover:bg-surface-container-low focus:bg-surface-container-low'
                )}
              >
                {item.icon && <Icon name={item.icon} size={16} />}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
