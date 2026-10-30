import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { VoterShell } from '../../components/voter/VoterChrome';
import { useVotingSession } from '../../features/voting/VotingSessionContext';
import { cn } from '../../lib/cn';
import { VotingLinkRequiredNotice } from './VotingLinkRequiredNotice';
import type { BallotCandidate } from '../../features/voting/types';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** One candidate as an impartial ballot row: identical size/weight for every candidate, a large tick target, optional bio. */
function CandidateOption({
  candidate,
  selected,
  multi,
  disabled,
  onToggle,
  name,
  index,
}: {
  index: number;
  candidate: BallotCandidate;
  selected: boolean;
  multi: boolean;
  disabled: boolean;
  onToggle: () => void;
  name: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li style={{ ['--i' as string]: index }}>
      <label
        className={cn(
          'group relative flex items-center gap-4 p-4 sm:p-5 rounded-2xl border bg-surface-container-lowest cursor-pointer',
          'transition-[border-color,background-color,box-shadow] duration-200',
          selected ? 'candidate-card-selected' : 'border-outline-variant hover:border-outline',
          disabled && !selected && 'opacity-55 cursor-not-allowed'
        )}
      >
        <input
          type={multi ? 'checkbox' : 'radio'}
          name={name}
          checked={selected}
          disabled={disabled && !selected}
          onChange={onToggle}
          className="sr-only peer"
        />
        {candidate.photoUrl ? (
          <img src={candidate.photoUrl} alt="" loading="lazy" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 bg-surface-container" />
        ) : (
          <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center font-serif text-[1.25rem] shrink-0" aria-hidden="true">
            {initials(candidate.name)}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block font-serif text-[1.3rem] leading-tight break-words">{candidate.name}</span>
          {candidate.bio && (
            <span className={cn('mt-1 block text-[0.875rem] text-secondary', !expanded && 'line-clamp-2')}>{candidate.bio}</span>
          )}
        </span>
        <span
          className={cn(
            'w-8 h-8 shrink-0 flex items-center justify-center border-2 transition-colors duration-200',
            multi ? 'rounded-lg' : 'rounded-full',
            selected ? 'bg-primary border-primary text-on-primary' : 'border-outline group-hover:border-on-background',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary'
          )}
          aria-hidden="true"
        >
          {selected && <Icon name="check" size={18} strokeWidth={3} className="animate-pop" />}
        </span>
      </label>
      {candidate.bio && candidate.bio.length > 110 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1.5 ml-4 text-[0.8125rem] font-medium text-primary hover:underline underline-offset-4"
        >
          {expanded ? 'Show less' : `Read more about ${candidate.name}`}
        </button>
      )}
    </li>
  );
}

/** One contest per screen: the question, impartial candidate rows, and a sticky bar to move through the ballot. */
export function SelectCandidatePage() {
  const { positionId } = useParams<{ positionId: string }>();
  const navigate = useNavigate();
  const { session, ballot, selections, setSelection } = useVotingSession();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const positionIndex = ballot?.positions.findIndex((p) => p.id === positionId) ?? -1;
  const position = positionIndex >= 0 ? ballot!.positions[positionIndex] : undefined;
  const [current, setCurrent] = useState<string[]>(() => (positionId ? selections[positionId] ?? [] : []));

  useEffect(() => {
    setCurrent(positionId ? selections[positionId] ?? [] : []);
  }, [positionId, selections]);

  // Each contest is a new screen: reset scroll and move focus to its heading for screen-reader users.
  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [positionId]);

  if (!session || !ballot) return <VotingLinkRequiredNotice />;

  if (!position) {
    return (
      <VoterShell step="ballot">
        <h1 className="font-serif text-headline-xl">Contest not found</h1>
        <Button variant="secondary" className="mt-6" onClick={() => navigate(`/vote/select/${ballot.positions[0].id}`)}>
          Back to the start of the ballot
        </Button>
      </VoterShell>
    );
  }

  const total = ballot.positions.length;
  const multi = position.maxSelections > 1;
  const atLimit = multi && current.length >= position.maxSelections;
  const isLast = positionIndex + 1 === total;

  const toggle = (id: string) => {
    if (current.includes(id)) return setCurrent(current.filter((c) => c !== id));
    if (!multi) return setCurrent([id]);
    if (current.length < position.maxSelections) setCurrent([...current, id]);
  };

  const go = (index: number) => {
    setSelection(position.id, current);
    if (index < 0) return navigate('/vote/verify');
    if (index >= total) return navigate('/vote/review');
    navigate(`/vote/select/${ballot.positions[index].id}`);
  };

  const chosenNames = position.candidates.filter((c) => current.includes(c.id)).map((c) => c.name);

  return (
    <VoterShell step="ballot">
      <div key={position.id} className="animate-rise pb-28">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="eyebrow">
            Contest {positionIndex + 1} of {total}
          </p>
          <ol className="flex gap-1" aria-hidden="true">
            {ballot.positions.map((p, i) => (
              <li key={p.id} className={cn('h-1.5 rounded-full transition-all duration-300', i === positionIndex ? 'w-6 bg-on-background' : i < positionIndex ? 'w-1.5 bg-primary' : 'w-1.5 bg-surface-container-high')} />
            ))}
          </ol>
        </div>

        <h1 ref={headingRef} tabIndex={-1} className="font-serif text-headline-xl focus:outline-none">
          {position.title}
        </h1>
        {position.description && <p className="mt-2 text-body-lg text-secondary">{position.description}</p>}

        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-container-low border border-outline-variant px-3 py-1.5 text-[0.8125rem] text-on-surface-variant" aria-live="polite">
          <Icon name="info" size={14} />
          {multi ? (
            <>
              Choose up to <strong className="font-semibold">{position.maxSelections}</strong> · {current.length} selected
            </>
          ) : (
            'Choose one candidate, or leave blank to abstain'
          )}
        </p>

        <fieldset className="mt-6">
          <legend className="sr-only">
            {position.title}: {multi ? `choose up to ${position.maxSelections}` : 'choose one'}
          </legend>
          {position.candidates.length > 0 ? (
            <ul className="space-y-3 stagger">
              {position.candidates.map((c, i) => (
                  <CandidateOption
                    key={c.id}
                    index={i}
                    candidate={c}
                    name={`position-${position.id}`}
                    selected={current.includes(c.id)}
                    multi={multi}
                    disabled={atLimit}
                    onToggle={() => toggle(c.id)}
                  />
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-secondary">No candidates are standing for this position.</p>
          )}
        </fieldset>

        {current.length > 0 && (
          <button
            type="button"
            onClick={() => setCurrent([])}
            className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] text-secondary hover:text-on-background underline-offset-4 hover:underline"
          >
            <Icon name="close" size={14} />
            Clear my choice{multi && current.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-outline-variant safe-bottom">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-3 sm:pb-3">
          <p className="mb-2.5 text-[0.8125rem] text-secondary truncate" aria-live="polite">
            {chosenNames.length ? (
              <>
                Your choice: <span className="text-on-background font-medium">{chosenNames.join(', ')}</span>
              </>
            ) : (
              'No choice yet — you will abstain on this contest if you continue.'
            )}
          </p>
          <nav aria-label="Ballot navigation" className="flex gap-2.5">
            <Button variant="secondary" size="lg" className="px-4 sm:px-6" leftIcon="arrow_back" onClick={() => go(positionIndex - 1)} aria-label={positionIndex === 0 ? 'Back to identity confirmation' : 'Previous contest'}>
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Button size="lg" className="flex-1" rightIcon="arrow_forward" onClick={() => go(positionIndex + 1)}>
              {isLast ? 'Review my ballot' : `Next: ${ballot.positions[positionIndex + 1].title}`}
            </Button>
          </nav>
        </div>
      </div>
    </VoterShell>
  );
}
