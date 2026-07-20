import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui';

export interface MobileTopBarProps {
  title?: string;
  showBack?: boolean;
  centerTitle?: boolean;
  rightSlot?: React.ReactNode;
}

/** Fixed mobile header shared by the verification/selection/review voter screens. */
export function MobileTopBar({ title, showBack = true, centerTitle = false, rightSlot }: MobileTopBarProps) {
  const navigate = useNavigate();
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-margin-mobile h-16 bg-surface border-b border-outline-variant shadow-sm">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high transition-transform active:scale-90"
          >
            <Icon name="arrow_back" />
          </button>
        )}
        {title && !centerTitle && (
          <span className="text-headline-sm font-headline-sm font-bold text-primary">{title}</span>
        )}
      </div>
      {title && centerTitle && (
        <span className="text-label-md font-label-md uppercase tracking-widest text-on-surface-variant">{title}</span>
      )}
      <div className="flex items-center gap-2">
        {rightSlot ?? (
          <>
            <span className="p-2 text-secondary">
              <Icon name="notifications" />
            </span>
            <span className="p-2 text-secondary">
              <Icon name="account_circle" />
            </span>
          </>
        )}
      </div>
    </header>
  );
}
