import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Modal } from '../../components/ui';
import { votersApi } from './votersApi';
import { buildInviteMessage, whatsappNumber, whatsappUrl } from './inviteMessage';
import type { WhatsappQueueVoter } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  electionTitle?: string | null;
  endTime?: string | null;
}

const SENT_KEY = 'ida-whatsapp-opened';

/** Which links this browser has already opened in WhatsApp (keyed by voter + link tail so a replaced link counts as new). */
function loadOpened(): Set<string> {
  try {
    return new Set<string>(JSON.parse(sessionStorage.getItem(SENT_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}
function saveOpened(set: Set<string>) {
  try {
    sessionStorage.setItem(SENT_KEY, JSON.stringify([...set]));
  } catch {
    /* private window: the marks just don't survive a refresh */
  }
}
const keyOf = (v: WhatsappQueueVoter) => `${v.id}:${v.votingLink.slice(-12)}`;

/**
 * Works through every voter who holds a live link: one button opens WhatsApp on that member's chat with the message
 * already typed. The admin taps Send in WhatsApp, comes back and presses the button again for the next member.
 * (WhatsApp does not let a website send a message on its own: that needs the WhatsApp Business API.)
 */
export function WhatsappQueueModal({ open, onClose, electionTitle, endTime }: Props) {
  const [voters, setVoters] = useState<WhatsappQueueVoter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(loadOpened);

  const load = useCallback(() => {
    setVoters(null);
    setError(null);
    votersApi
      .whatsappQueue()
      .then((r) => setVoters(r.voters))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the voting links'));
  }, []);

  useEffect(() => {
    if (open) load();
    else setVoters(null); // never keep links in memory while the window is closed
  }, [open, load]);

  const rows = useMemo(
    () => (voters ?? []).map((v) => ({ v, number: whatsappNumber(v.phone), done: opened.has(keyOf(v)) })),
    [voters, opened]
  );
  const sendable = rows.filter((r) => r.number);
  const pending = sendable.filter((r) => !r.done);
  const noPhone = rows.length - sendable.length;

  const openChat = (v: WhatsappQueueVoter) => {
    const url = whatsappUrl(
      v.phone,
      buildInviteMessage({ fullName: v.fullName, votingLink: v.votingLink, electionTitle, endTime })
    );
    if (!url) return;
    window.open(url, 'ida-whatsapp'); // same tab each time, so the admin isn't left with dozens of tabs
    setOpened((prev) => {
      const next = new Set(prev).add(keyOf(v));
      saveOpened(next);
      return next;
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Send links on WhatsApp"
      description="WhatsApp opens on each member's chat with their message and private link already typed. Tap Send in WhatsApp, then come back here."
    >
      {error ? (
        <div className="space-y-3">
          <p className="text-body-md text-error">{error}</p>
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      ) : voters === null ? (
        <p className="text-body-md text-secondary py-6">Loading voting links…</p>
      ) : rows.length === 0 ? (
        <p className="text-body-md text-secondary py-6">
          No active voting links yet. Issue links from the voter list first, then come back here.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-secondary">
            <span><strong className="text-on-surface tabular">{rows.length}</strong> links ready</span>
            <span><strong className="text-on-surface tabular">{rows.filter((r) => r.done).length}</strong> opened in WhatsApp</span>
            {noPhone > 0 && <span className="text-warning"><strong className="tabular">{noPhone}</strong> without a usable phone number</span>}
          </div>

          <Button
            size="lg"
            className="w-full"
            leftIcon="chat"
            disabled={pending.length === 0}
            onClick={() => openChat(pending[0].v)}
          >
            {pending.length === 0 ? 'All numbers done' : `Open WhatsApp for ${pending[0].v.fullName} (${pending.length} left)`}
          </Button>

          <ul className="max-h-[45vh] overflow-y-auto divide-y divide-outline-variant rounded-xl border border-outline-variant">
            {rows.map(({ v, number, done }) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{v.fullName}</p>
                  <p className="text-[0.75rem] text-secondary tabular">{number ? `+${number}` : v.phone || 'No phone number on file'}</p>
                </div>
                {!number ? (
                  <Badge variant="outline">Fix number</Badge>
                ) : (
                  <>
                    {done && <Badge variant="success" dot>Opened</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => openChat(v)}>
                      {done ? 'Open again' : 'Open'}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <p className="text-[0.75rem] text-secondary">
            “Opened” means the chat was opened for you; WhatsApp does not tell this site whether you pressed Send. Each link works for one vote only, so do not share this window.
          </p>
        </div>
      )}
    </Modal>
  );
}
