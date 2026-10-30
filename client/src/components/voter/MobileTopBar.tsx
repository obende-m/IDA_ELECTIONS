import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui';
import { BrandMark } from '../Brand';

export interface MobileTopBarProps {
  title?: string;
  showBack?: boolean;
  centerTitle?: boolean;
  rightSlot?: ReactNode;
  onBack?: () => void;
}

/** Sticky voter header: back control, small brand mark + title, optional right slot. */
export function MobileTopBar({ title, showBack = true, rightSlot, onBack }: MobileTopBarProps) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-outline-variant">
      <div className="max-w-2xl mx-auto h-16 px-3 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={onBack ?? (() => navigate(-1))}
              aria-label="Go back"
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-low active:scale-95 transition"
            >
              <Icon name="arrow_back" />
            </button>
          ) : (
            <span className="w-11 h-11 flex items-center justify-center">
              <BrandMark size={30} className="text-on-background" />
            </span>
          )}
          {title && <span className="text-[0.9375rem] font-medium truncate">{title}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>
      </div>
    </header>
  );
}
