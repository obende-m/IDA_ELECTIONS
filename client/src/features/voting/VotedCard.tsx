import { useEffect, useState } from 'react';
import { Button, useToast } from '../../components/ui';
import { drawVotedCard } from './drawVotedCard';

interface Props {
  fullName: string | null;
  electionLabel: string;
}

/**
 * Shareable "I have voted" card shown after a confirmed ballot. Made on the device (nothing is
 * uploaded) and holds no reference number or choices, so it is safe to post in a group.
 */
export function VotedCard({ fullName, electionLabel }: Props) {
  const { toast } = useToast();
  const [showName, setShowName] = useState(Boolean(fullName));
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [date] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    drawVotedCard({ name: showName ? fullName : null, electionLabel, date })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url });
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [showName, fullName, electionLabel, date]);

  if (failed) return null;

  const fileName = 'I-have-voted-IDA.png';
  const shareText = `I have voted in the ${electionLabel}. Have you voted yet? Use the personal voting link sent to you.`;

  const download = () => {
    if (!card) return;
    const a = document.createElement('a');
    a.href = card.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const file = card ? new File([card.blob], fileName, { type: 'image/png' }) : null;
  const canShare = Boolean(file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: shareText });
    } catch (err) {
      // Closing the share sheet is not an error worth showing.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast({ title: 'Could not open sharing', description: 'Download the card instead, then share it from your gallery.', variant: 'error' });
    }
  };

  return (
    <section aria-label="Share that you voted" className="no-print mt-10 rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden animate-rise" style={{ animationDelay: '200ms' }}>
      <div className="p-6 sm:p-8 grid gap-6 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center">
        <div className="mx-auto w-full max-w-[15rem] aspect-[4/5] rounded-xl overflow-hidden bg-primary shadow-[0_18px_40px_-24px_rgb(15_76_69/0.8)]">
          {card && <img src={card.url} alt={`I have voted card${showName && fullName ? ` for ${fullName}` : ''}`} className="w-full h-full object-cover" />}
        </div>
        <div>
          <p className="eyebrow">Encourage others</p>
          <h2 className="font-serif text-[1.5rem] sm:text-[1.75rem] leading-tight mt-2">Tell the group you have voted</h2>
          <p className="mt-3 text-[0.9375rem] text-secondary">
            Share this card in your IDA groups to remind other members to vote. It does not show your reference number or who you voted for.
          </p>
          {fullName && (
            <label className="mt-4 flex items-center gap-2.5 text-[0.9375rem] cursor-pointer select-none">
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
              Show my name on the card
            </label>
          )}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            {canShare && (
              <Button size="lg" leftIcon="share" onClick={share} disabled={!card}>
                Share card
              </Button>
            )}
            <Button variant={canShare ? 'secondary' : 'primary'} size="lg" leftIcon="download" onClick={download} disabled={!card}>
              Download card
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
