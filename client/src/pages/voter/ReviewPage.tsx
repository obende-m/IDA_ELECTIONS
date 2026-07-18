import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { MobileTopBar } from '../../components/voter/MobileTopBar';

const SELECTIONS = [
  { position: 'Chairman', candidate: 'Dr. Emmanuel Ojo' },
  { position: 'Vice Chairman', candidate: 'Chief Adesuwa Okon' },
  { position: 'Secretary General', candidate: 'Mr. Kayode Bello' },
  { position: 'Financial Director', candidate: 'Hon. Sarah Amadu' },
];

/** Ported from review_confirm_vote_mobile/code.html; the submit action lands on the atomic vote-cast transaction in the Voting Flow module. */
export function ReviewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleCastVote = async () => {
    setSubmitting(true);
    // Atomic "record vote + invalidate token" transaction is wired up in the Voting Flow module.
    setTimeout(() => {
      setSubmitting(false);
      navigate('/vote/success');
    }, 800);
  };

  return (
    <>
      <MobileTopBar title="IDA Election Portal" />

      <main className="mt-16 mb-8 px-6 py-8 flex-grow max-w-lg mx-auto w-full flex flex-col items-center">
        <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mb-4">
          <Icon name="shield" filled size={28} className="text-primary" />
        </div>
        <h1 className="text-headline-md font-headline-md text-center mb-2">Review Your Ballot</h1>
        <p className="text-body-md text-secondary text-center mb-6">Please verify your selections before final submission.</p>

        <div className="w-full flex items-center gap-2 bg-surface-container px-4 py-2 border-t-2 border-primary-container mb-6">
          <Icon name="shield" filled size={18} className="text-primary" />
          <span className="text-label-md font-label-md uppercase tracking-widest text-secondary">Secure Session Encrypted</span>
        </div>

        <div className="w-full space-y-0">
          {SELECTIONS.map((item) => (
            <div key={item.position} className="w-full border border-on-background flex items-center justify-between p-4 -mt-px first:mt-0">
              <div>
                <p className="text-label-sm font-label-sm text-secondary uppercase">{item.position}</p>
                <p className="text-headline-sm font-headline-sm">{item.candidate}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center">
                  <Icon name="account_circle" size={28} className="text-secondary" />
                </div>
                <button
                  className="w-8 h-8 flex items-center justify-center border border-primary-container text-primary"
                  aria-label={`Edit ${item.position} selection`}
                  onClick={() => navigate('/vote/select/1')}
                >
                  <Icon name="edit" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full mt-6 p-4 border border-dashed border-outline-variant bg-surface-container-low flex gap-3">
          <Icon name="info" className="text-secondary shrink-0" />
          <p className="text-body-md italic text-secondary">
            Once you cast your vote, your choices are encrypted and recorded permanently on the digital ballot. This action
            cannot be undone.
          </p>
        </div>

        <div className="w-full mt-8 space-y-3">
          <Button variant="gold" size="lg" fullWidth uppercase leftIcon="shield" loading={submitting} onClick={handleCastVote}>
            Cast My Vote
          </Button>
          <Button variant="secondary" size="lg" fullWidth uppercase onClick={() => navigate(-1)}>
            Back to Selection
          </Button>
        </div>

        <p className="text-label-sm font-label-sm text-secondary opacity-60 mt-8">© 2024 Igarra Development Association (IDA)</p>
      </main>
    </>
  );
}
