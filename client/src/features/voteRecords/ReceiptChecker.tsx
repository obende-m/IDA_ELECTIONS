import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, Field, Icon } from '../../components/ui';
import { ApiError } from '../../lib/apiClient';
import { formatVotingTime } from '../voters/inviteMessage';
import { voteRecordsApi } from './voteRecordsApi';
import type { ReceiptCheck, ReceiptLink } from './types';

const time = (value: string | null | undefined) => formatVotingTime(value) ?? '—';

function linkLabel(link: ReceiptLink): { text: string; variant: 'success' | 'error' | 'neutral' } {
  if (link.status === 'CONSUMED') return { text: 'Used to vote', variant: 'success' };
  if (link.status === 'REVOKED') return { text: 'Voided', variant: 'error' };
  return { text: 'Not used', variant: 'neutral' };
}

interface Props {
  /** Filters the vote records table to this ballot, showing its choices (that view is audit-logged too). */
  onShowChoices: (referenceNumber: string) => void;
}

/**
 * Dispute tool: is the reference number on a voter's receipt genuine, whose ballot is it, and what
 * happened to their voting link? Shows no choices; those stay in the table below.
 */
export function ReceiptChecker({ onShowChoices }: Props) {
  const [reference, setReference] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ReceiptCheck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async (e: FormEvent) => {
    e.preventDefault();
    if (reference.trim().length < 4) {
      setError('Enter the reference number from the voter’s receipt.');
      return;
    }
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      setResult(await voteRecordsApi.checkReceipt(reference));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not check this receipt. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="mb-6 overflow-hidden">
      <form onSubmit={check} className="px-5 sm:px-6 py-5 border-b border-outline-variant grid gap-3">
        <div>
          <h2 className="font-serif text-[1.375rem] leading-tight">Check a receipt</h2>
          <p className="mt-1 text-body-md text-secondary">
            Enter the reference number from a voter’s receipt to confirm it is genuine. Dashes and capitals don’t matter.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[14rem] max-w-md">
            <Field
              id="receipt-reference"
              label="Reference number"
              placeholder="IDA-7KQ4-M2XP-9HTA"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </div>
          <Button type="submit" leftIcon="search" loading={checking}>
            Check receipt
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-[0.875rem] text-error">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div role="status" aria-live="polite" className="px-5 sm:px-6 py-5 grid gap-4 animate-fade">
          {result.found ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success" icon="check_circle">Genuine receipt</Badge>
                <span className="font-mono text-[0.875rem]">{result.referenceNumber}</span>
                {result.election && !result.election.isCurrent && (
                  <Badge variant="warning">From another election: {result.election.title} {result.election.year}</Badge>
                )}
              </div>

              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="eyebrow">Voter</dt>
                  <dd className="mt-1 font-medium break-words">{result.voter?.fullName}</dd>
                  <dd className="font-mono text-[0.75rem] text-secondary">{result.voter?.membershipNumber}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Ballot cast</dt>
                  <dd className="mt-1 tabular">{time(result.castAt)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Contests</dt>
                  <dd className="mt-1">
                    Voted in {result.contestsVoted}
                    {result.contestsAbstained ? `, abstained in ${result.contestsAbstained}` : ''}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="eyebrow mb-2">Voting link history</p>
                <ol className="grid gap-2">
                  {result.linkHistory?.map((link, i) => {
                    const label = linkLabel(link);
                    return (
                      <li key={i} className="rounded-lg border border-outline-variant px-4 py-3 grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[0.75rem] text-secondary">Link {i + 1}</span>
                          <Badge variant={label.variant}>{label.text}</Badge>
                        </div>
                        <p className="text-[0.875rem] text-secondary tabular">
                          Issued {time(link.issuedAt)}
                          {link.firstOpenedAt && <> · First opened {time(link.firstOpenedAt)}</>}
                          {link.usedAt && <> · Used {time(link.usedAt)}</>}
                          {link.revokedAt && <> · Voided {time(link.revokedAt)}</>}
                        </p>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-2 text-[0.8125rem] text-secondary">
                  Times are Nigeria time. If the voter says they never opened their link, compare these times with their account of events.
                </p>
              </div>

              {result.election?.isCurrent && (
                <div>
                  <Button variant="secondary" leftIcon="visibility" onClick={() => onShowChoices(result.referenceNumber)}>
                    Show this ballot’s choices
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex gap-3">
              <Icon name="report" size={22} className="text-error shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No ballot has the reference {result.referenceNumber}.</p>
                <p className="mt-1 text-body-md text-secondary">
                  Check it was typed correctly. If it was copied exactly from the voter’s receipt, the receipt is not genuine.
                </p>
              </div>
            </div>
          )}
          <p className="text-[0.75rem] text-secondary">This check was recorded in the audit log under your name.</p>
        </div>
      )}
    </Card>
  );
}
