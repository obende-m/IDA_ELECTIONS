import { useEffect, useState } from 'react';
import { Icon } from './ui';

const SHOW_AFTER_PX = 400;

/** Floating scroll-to-top control for long admin pages (audit log, voter lists, etc.). */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center bg-on-background text-on-primary border-2 border-on-background hover:bg-primary-container hover:text-on-primary-container hover:border-primary-container transition-colors shadow-lg"
    >
      <Icon name="arrow_upward" size={20} />
    </button>
  );
}
