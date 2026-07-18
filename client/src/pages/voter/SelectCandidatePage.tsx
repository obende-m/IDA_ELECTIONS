import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { MobileTopBar } from '../../components/voter/MobileTopBar';
import { useVotingSession } from '../../features/voting/VotingSessionContext';
import { cn } from '../../lib/cn';

/** Ported from candidate_selection_mobile/code.html, now driven by the real fetched ballot and accumulating real selections. */
export function SelectCandidatePage() {
  const { positionId } = useParams<{ positionId: string }>();
  const navigate = useNavigate();
  const { session, ballot, selections, setSelection } = useVotingSession();

  const positionIndex = ballot?.positions.findIndex((p) => p.id === positionId) ?? -1;
  const position = positionIndex >= 0 ? ballot!.positions[positionIndex] : undefined;

  const [current, setCurrent] = useState<string[]>(() => (positionId ? selections[positionId] ?? [] : []));

  useEffect(() => {
    setCurrent(positionId ? selections[positionId] ?? [] : []);
  }, [positionId, selections]);

  if (!session || !ballot) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile py-16 text-center min-h-screen">
        <Icon name="error" size={40} className="text-secondary mb-4" />
        <h1 className="text-headline-lg font-headline-lg uppercase mb-3">No Active Ballot</h1>
        <p className="text-body-md text-secondary max-w-sm">Please start again from your personal voting link.</p>
      </main>
    );
  }

  if (!position) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile py-16 text-center min-h-screen">
        <Icon name="error" size={40} className="text-secondary mb-4" />
        <h1 className="text-headline-lg font-headline-lg uppercase mb-3">Position Not Found</h1>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(`/vote/select/${ballot.positions[0].id}`)}>
          Back to Start of Ballot
        </Button>
      </main>
    );
  }

  const progressPct = ((positionIndex + 1) / ballot.positions.length) * 100;
  const isMultiSelect = position.maxSelections > 1;

  const toggleCandidate = (candidateId: string) => {
    if (current.includes(candidateId)) {
      setCurrent(current.filter((id) => id !== candidateId));
      return;
    }
    if (isMultiSelect) {
      if (current.length >= position.maxSelections) return;
      setCurrent([...current, candidateId]);
    } else {
      setCurrent([candidateId]);
    }
  };

  const goToPosition = (index: number) => {
    setSelection(position.id, current);
    if (index < 0) {
      navigate('/vote/verify');
      return;
    }
    if (index >= ballot.positions.length) {
      navigate('/vote/review');
      return;
    }
    navigate(`/vote/select/${ballot.positions[index].id}`);
  };

  return (
    <>
      <MobileTopBar title="IDA Election Portal" />

      <main className="mt-16 mb-24 px-6 py-8 flex-grow max-w-lg mx-auto w-full">
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">Select Candidate for {position.title}</h1>
              {position.maxSelections > 1 && (
                <p className="text-label-md font-label-md text-secondary mt-1">
                  Select up to {position.maxSelections} ({current.length} selected)
                </p>
              )}
            </div>
            <span className="font-label-md text-label-md text-secondary whitespace-nowrap">
              {positionIndex + 1} of {ballot.positions.length}
            </span>
          </div>
          <div className="h-1 bg-surface-container-highest w-full overflow-hidden">
            <div className="h-full bg-primary-container" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <div className="bg-primary-container px-3 py-1 flex items-center gap-1">
            <Icon name="verified_user" filled size={16} />
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-primary-container font-bold">
              Secure Voting Protocol Active
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {position.candidates.map((candidate) => {
            const isSelected = current.includes(candidate.id);
            return (
              <div
                key={candidate.id}
                onClick={() => toggleCandidate(candidate.id)}
                className={cn(
                  'bg-surface border-2 border-on-background flex flex-col transition-all cursor-pointer group',
                  isSelected && 'candidate-card-selected'
                )}
              >
                <div className="relative w-full h-56 bg-surface-container-high flex items-center justify-center">
                  {candidate.photoUrl ? (
                    <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="account_circle" size={72} className="text-secondary" />
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-headline-md text-headline-md mb-1 uppercase">{candidate.name}</h3>
                  {candidate.bio && <p className="font-body-md text-body-md text-secondary mb-4">{candidate.bio}</p>}
                  <div className="flex items-center justify-end">
                    <button
                      className={cn(
                        'px-8 py-3 font-label-md text-label-md uppercase tracking-wider transition-all',
                        isSelected
                          ? 'bg-primary-container text-on-primary-container font-bold'
                          : 'bg-on-background text-on-primary group-hover:bg-primary-container group-hover:text-on-primary-container'
                      )}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {position.candidates.length === 0 && (
            <p className="text-body-md text-secondary italic text-center py-8">No candidates were registered for this position.</p>
          )}
        </div>

        <div className="mt-8 p-4 bg-surface-container border-l-4 border-primary">
          <p className="font-body-md text-body-md italic text-on-surface">
            {isMultiSelect
              ? `You can select up to ${position.maxSelections} candidates for this position, or leave it blank to abstain.`
              : 'You can select one candidate for this position, or leave it blank to abstain. You can change your answer until you cast your final vote.'}
          </p>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t-2 border-outline-variant px-6 py-4 flex gap-4 z-50">
        <Button variant="secondary" uppercase className="flex-1" leftIcon="chevron_left" onClick={() => goToPosition(positionIndex - 1)}>
          Previous
        </Button>
        <Button variant="gold" uppercase className="flex-[1.5]" rightIcon="chevron_right" onClick={() => goToPosition(positionIndex + 1)}>
          {positionIndex + 1 === ballot.positions.length ? 'Review Ballot' : 'Next Position'}
        </Button>
      </nav>

      <footer className="mb-28 text-center px-margin-mobile pt-8">
        <p className="font-label-sm text-label-sm text-secondary opacity-60">
          © 2024 Igarra Development Association (IDA).
          <br />
          Secure Electronic Voting System.
        </p>
      </footer>
    </>
  );
}
