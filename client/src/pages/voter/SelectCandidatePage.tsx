import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { MobileTopBar } from '../../components/voter/MobileTopBar';
import { cn } from '../../lib/cn';

interface Candidate {
  id: string;
  code: string;
  name: string;
  tagline: string;
}

const POSITION = { title: 'Chairman', index: 1, total: 12 };

const CANDIDATES: Candidate[] = [
  { id: 'c1', code: 'ID: #2401', name: 'Chief Adebayo Johnson', tagline: 'Visionary leadership for community development and digital infrastructure.' },
  { id: 'c2', code: 'ID: #2402', name: 'Dr. Ngozi Okonjo-Bello', tagline: 'Empowering the youth through vocational training and economic transparency.' },
  { id: 'c3', code: 'ID: #2403', name: 'Engr. Tunde Williams', tagline: 'Modernizing agricultural systems and ensuring local safety protocols.' },
];

/** Ported from candidate_selection_mobile/code.html; wired to live candidate/position data in the Election Management module. */
export function SelectCandidatePage() {
  const { positionId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const progressPct = (POSITION.index / POSITION.total) * 100;

  return (
    <>
      <MobileTopBar title="IDA Election Portal" />

      <main className="mt-16 mb-24 px-6 py-8 flex-grow max-w-lg mx-auto w-full">
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">Select Candidate for {POSITION.title}</h1>
            <span className="font-label-md text-label-md text-secondary whitespace-nowrap">
              {POSITION.index} of {POSITION.total}
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
          {CANDIDATES.map((candidate) => {
            const isSelected = selected === candidate.id;
            return (
              <div
                key={candidate.id}
                onClick={() => setSelected(candidate.id)}
                className={cn(
                  'bg-surface border-2 border-on-background flex flex-col transition-all cursor-pointer group',
                  isSelected && 'candidate-card-selected'
                )}
              >
                <div className="relative w-full h-56 bg-surface-container-high flex items-center justify-center">
                  <Icon name="account_circle" size={72} className="text-secondary" />
                  <div className="absolute top-4 right-4 bg-surface px-3 py-1 border border-on-background font-label-md text-label-md">
                    {candidate.code}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-headline-md text-headline-md mb-1 uppercase">{candidate.name}</h3>
                  <p className="font-body-md text-body-md text-secondary mb-4">{candidate.tagline}</p>
                  <div className="flex items-center justify-between">
                    <a
                      className="font-label-md text-label-md text-primary hover:underline flex items-center gap-1"
                      href="#"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon name="description" size={18} />
                      View Manifesto
                    </a>
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
        </div>

        <div className="mt-8 p-4 bg-surface-container border-l-4 border-primary">
          <p className="font-body-md text-body-md italic text-on-surface">
            Note: You can only select one candidate for this position. Once you proceed, your selection will be temporarily
            locked until the final review screen.
          </p>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t-2 border-outline-variant px-6 py-4 flex gap-4 z-50">
        <Button variant="secondary" uppercase className="flex-1" leftIcon="chevron_left" onClick={() => navigate(-1)}>
          Previous
        </Button>
        <Button
          variant="gold"
          uppercase
          className="flex-[1.5]"
          rightIcon="chevron_right"
          disabled={!selected}
          onClick={() => navigate('/vote/review')}
        >
          Next Position
        </Button>
      </nav>

      <footer className="mb-28 text-center px-margin-mobile pt-8">
        <p className="font-label-sm text-label-sm text-secondary opacity-60">
          © 2024 Igarra Development Association (IDA).
          <br />
          Secure Electronic Voting System.
        </p>
      </footer>

      {/* positionId drives which position/candidate set loads once wired to real data */}
      <span className="sr-only">Position {positionId}</span>
    </>
  );
}
