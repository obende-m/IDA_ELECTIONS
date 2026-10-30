import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';
import { VoterShell } from '../../components/voter/VoterChrome';
import { useVotingSession } from '../../features/voting/VotingSessionContext';

const HOW_IT_WORKS = [
  { n: '01', title: 'Open your personal link', body: 'The Electoral Committee sends every eligible member a private voting link. It works once, only for you.' },
  { n: '02', title: 'Confirm it is you', body: 'Check the name and membership number on screen before you continue.' },
  { n: '03', title: 'Mark your ballot', body: 'One contest at a time. You may choose, change your mind, or leave a contest blank.' },
  { n: '04', title: 'Review and cast', body: 'Check every choice on one page, then cast. You receive a reference number as your receipt.' },
];

/**
 * Public landing page for /vote. Voting is link-only, so this page explains the process; it never lists
 * candidates or results (those are only fetched with a valid personal link).
 */
export function WelcomePage() {
  const { session, ballot } = useVotingSession();
  const year = ballot?.election.year;

  return (
    <VoterShell width="lg">
      <section className="animate-rise grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16 items-end pt-2 sm:pt-6">
        <div>
          <p className="eyebrow mb-5">Igarra Development Association · {year ? `${year} ` : ''}General Election</p>
          <h1 className="font-serif text-display text-on-background">
            Every member,
            <br />
            <span className="italic font-normal text-primary">one voice.</span>
          </h1>
          <p className="mt-6 text-body-lg text-on-surface-variant max-w-lg">
            The official, secure way to vote for the officers of the Igarra Development Association — from your phone, in a few minutes.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            {session ? (
              <Link
                to="/vote/verify"
                className="group inline-flex items-center justify-center gap-2 h-14 px-7 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary-hover transition-colors"
              >
                Continue voting
                <Icon name="arrow_forward" size={18} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <a
                href="#how"
                className="group inline-flex items-center justify-center gap-2 h-14 px-7 rounded-xl bg-on-background text-on-primary font-semibold hover:bg-[#2a2f31] transition-colors"
              >
                How to vote
                <Icon name="expand_more" size={18} className="transition-transform group-hover:translate-y-0.5" />
              </a>
            )}
          </div>
          {!session && (
            <p className="mt-4 text-[0.875rem] text-secondary max-w-md">
              To vote, open the personal link sent to you by the Electoral Committee. There is no sign-up and no password.
            </p>
          )}
        </div>

        <aside aria-label="Your vote is protected" className="rounded-2xl bg-primary text-on-primary p-7 sm:p-8 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full border border-white/10" aria-hidden="true" />
          <div className="absolute -right-2 -top-2 w-28 h-28 rounded-full border border-white/10" aria-hidden="true" />
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-primary-fixed-dim">Your vote is protected</p>
          <ul className="mt-6 space-y-5">
            {[
              { icon: 'link', t: 'Single-use link', d: 'Each link records exactly one ballot, then stops working.' },
              { icon: 'lock', t: 'Encrypted connection', d: 'Everything you send travels over HTTPS.' },
              { icon: 'security', t: 'Independently audited', d: 'Every administrative action is permanently logged.' },
            ].map((f) => (
              <li key={f.t} className="flex gap-3.5">
                <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon name={f.icon} size={17} />
                </span>
                <div>
                  <p className="font-medium">{f.t}</p>
                  <p className="text-[0.875rem] text-on-primary/70">{f.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section id="how" aria-labelledby="how-title" className="mt-20 sm:mt-28 scroll-mt-24">
        <div className="flex items-end justify-between gap-6 border-b border-on-background pb-4">
          <h2 id="how-title" className="font-serif text-headline-lg">How voting works</h2>
          <span className="eyebrow hidden sm:block">Four steps · about 3 minutes</span>
        </div>
        <ol className="ruled">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.n} className="animate-rise grid grid-cols-[3rem_1fr] sm:grid-cols-[5rem_1fr_1.4fr] gap-x-4 gap-y-1 py-6" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="font-mono text-[0.8125rem] text-secondary pt-1">{s.n}</span>
              <h3 className="font-serif text-[1.375rem] leading-tight">{s.title}</h3>
              <p className="col-start-2 sm:col-start-3 text-body-md text-secondary">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <p className="eyebrow mb-2">Lost your link?</p>
          <p className="text-body-md text-on-surface-variant">Contact the IDA Electoral Committee. They can cancel the old link and send you a new one.</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <p className="eyebrow mb-2">Keep it private</p>
          <p className="text-body-md text-on-surface-variant">Anyone who opens your link can vote as you. Don't forward it, and close the page when you finish.</p>
        </div>
      </section>
    </VoterShell>
  );
}
